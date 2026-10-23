import { parseHTML } from 'linkedom';
import { z } from 'zod';
import type { AtsKind } from '../../../../shared/dto';
import {
  arr,
  asObject,
  canonicalUrl,
  form,
  json,
  jsonValue,
  question,
  salaryRange,
  str,
  titleFrom,
  type Dict,
} from './common';

const ObjectResponse = z.record(z.string(), z.unknown());
type LinkedomDocument = ReturnType<typeof parseHTML>['document'];

export interface MatchedPosting {
  ats: AtsKind;
  tenant: string | null;
  jobId: string | null;
  url: URL;
}
type Adapter = {
  match(url: URL): MatchedPosting | null;
  fetch(match: MatchedPosting): Promise<ReturnType<typeof form>>;
};

function greenhouseQuestionGroups(data: Dict) {
  const output = [];
  for (const group of [data.questions, data.location_questions])
    for (const q of arr(group)) {
      const d = asObject(q);
      for (const field of arr(d.fields)) {
        const f = asObject(field);
        const name = str(f.name, 300);
        const item = question(`gh:${name}`, d.label, f.type, d.required, f.values, output.length);
        if (item) output.push(item);
      }
    }
  for (const block of arr(data.compliance))
    for (const q of arr(asObject(block).questions)) {
      const d = asObject(q);
      for (const field of arr(d.fields)) {
        const f = asObject(field);
        const item = question(`gh:${str(f.name, 300)}`, d.label, f.type, d.required, f.values, output.length);
        if (item) output.push(item);
      }
    }
  for (const q of arr(asObject(data.demographic_questions).questions)) {
    const d = asObject(q);
    for (const field of arr(d.fields)) {
      const f = asObject(field);
      const item = question(`gh:${str(f.name, 300)}`, d.label, f.type, d.required, f.values, output.length);
      if (item) output.push(item);
    }
  }
  return output.slice(0, 200);
}

const greenhouse: Adapter = {
  match(url) {
    const host = url.hostname.toLowerCase();
    if (!['boards.greenhouse.io', 'job-boards.greenhouse.io', 'job-boards.eu.greenhouse.io'].includes(host))
      return null;
    if (url.pathname === '/embed/job_app') {
      const tenant = url.searchParams.get('for');
      const jobId = url.searchParams.get('token');
      if (!tenant || !jobId || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,80}$/.test(tenant) || !/^\d{1,20}$/.test(jobId))
        return null;
      return {
        ats: 'greenhouse',
        tenant,
        jobId,
        url: new URL(`https://boards.greenhouse.io/${encodeURIComponent(tenant)}/jobs/${encodeURIComponent(jobId)}`),
      };
    }
    const m = url.pathname.match(/^\/([A-Za-z0-9][A-Za-z0-9_.-]{0,80})\/jobs\/(\d+)/);
    if (!m) return null;
    const canonical = new URL(url);
    canonical.search = '';
    return { ats: 'greenhouse', tenant: m[1]!, jobId: m[2]!, url: canonical };
  },
  async fetch(m) {
    const d = await json(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(m.tenant!)}/jobs/${encodeURIComponent(m.jobId!)}?questions=true&pay_transparency=true`,
      ObjectResponse,
    );
    if (!str(d.title)) throw new Error('Greenhouse response did not contain a title');
    const salary = arr(d.pay_input_ranges).map((x) => asObject(x));
    const cents = salary.filter((x) => typeof x.min_cents === 'number' && typeof x.max_cents === 'number');
    const low = cents.length ? Math.min(...cents.map((x) => Number(x.min_cents))) : null;
    const high = cents.length ? Math.max(...cents.map((x) => Number(x.max_cents))) : null;
    const currency = str(cents[0]?.currency_type, 3)?.toUpperCase() ?? null;
    return form({
      company: str(d.company_name, 400) ?? titleFrom(m.tenant!),
      title: str(d.title, 400)!,
      location: str(asObject(d.location).name ?? d.location, 1000),
      salary: low !== null ? `${currency ?? ''} ${low / 100}–${high! / 100}`.trim() : null,
      salary_min: low === null ? null : Math.round(low / 100),
      salary_max: high === null ? null : Math.round(high! / 100),
      salary_currency: currency,
      description: str(d.content),
      canonical_url: m.url.href,
      ats: m.ats,
      ats_tenant: m.tenant,
      ats_job_id: m.jobId,
      questions: greenhouseQuestionGroups(d),
    });
  },
};

const lever: Adapter = {
  match(url) {
    if (!['jobs.lever.co', 'jobs.eu.lever.co'].includes(url.hostname.toLowerCase())) return null;
    const m = url.pathname.match(/^\/([A-Za-z0-9_.-]{1,80})\/([0-9a-f-]{32,36})(?:\/apply)?\/?$/i);
    if (!m) return null;
    const canonical = new URL(url);
    canonical.pathname = canonical.pathname.replace(/\/apply\/?$/, '');
    canonical.search = '';
    return { ats: 'lever', tenant: m[1]!, jobId: m[2]!, url: canonical };
  },
  async fetch(m) {
    const apiHost = m.url.hostname.includes('.eu.') ? 'api.eu.lever.co' : 'api.lever.co';
    const d = await json(
      `https://${apiHost}/v0/postings/${encodeURIComponent(m.tenant!)}/${encodeURIComponent(m.jobId!)}`,
      ObjectResponse,
    );
    if (!str(d.text)) throw new Error('Lever response did not contain a title');
    const cats = asObject(d.categories);
    const salary = salaryRange(d.salaryRange);
    const fallbackApply = `https://${m.url.hostname}/${encodeURIComponent(m.tenant!)}/${encodeURIComponent(m.jobId!)}/apply`;
    const applyCandidate = str(d.applyUrl);
    const apply = (() => {
      try {
        const candidate = new URL(applyCandidate ?? fallbackApply);
        return candidate.hostname === m.url.hostname ? candidate.href : fallbackApply;
      } catch {
        return fallbackApply;
      }
    })();
    const htmlQuestions = await parseHtmlQuestions(apply);
    return form({
      company: titleFrom(m.tenant!),
      title: str(d.text, 400)!,
      location: str(cats.location, 1000),
      ...salary,
      description:
        [str(d.descriptionPlain), str(d.additionalPlain)].filter(Boolean).join('\n\n').slice(0, 30000) || null,
      canonical_url: m.url.href,
      ats: m.ats,
      ats_tenant: m.tenant,
      ats_job_id: m.jobId,
      questions: htmlQuestions,
    });
  },
};

const ASHBY_QUERY =
  'query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) { jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) { id title departmentName locationName workplaceType employmentType descriptionHtml compensationTierSummary scrapeableCompensationSalarySummary secondaryLocationNames applicationDeadline isListed applicationForm { sections { title descriptionHtml fieldEntries { ... on FormFieldEntry { isRequired field descriptionHtml } } } } } }';
const ashby: Adapter = {
  match(url) {
    if (!['jobs.ashbyhq.com', 'jobs.eu.ashbyhq.com'].includes(url.hostname.toLowerCase())) return null;
    const m = url.pathname.match(/^\/([A-Za-z0-9_.-]{1,80})\/([0-9a-f-]{32,36})/i);
    return m ? { ats: 'ashby', tenant: m[1]!, jobId: m[2]!, url } : null;
  },
  async fetch(m) {
    const response = await json('https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting', ObjectResponse, {
      method: 'POST',
      body: JSON.stringify({
        operationName: 'ApiJobPosting',
        variables: { organizationHostedJobsPageName: m.tenant, jobPostingId: m.jobId },
        query: ASHBY_QUERY,
      }),
    });
    if (arr(response.errors).length) throw new Error('Ashby GraphQL returned errors');
    const d = asObject(asObject(response.data).jobPosting);
    if (!str(d.title)) throw new Error('Ashby response did not contain a title');
    const questions = [];
    for (const section of arr(asObject(d.applicationForm).sections))
      for (const entry of arr(asObject(section).fieldEntries)) {
        const e = asObject(entry);
        const f = asObject(e.field);
        const item = question(
          `ashby:${str(f.path ?? f.id, 300)}`,
          f.title,
          f.type,
          e.isRequired,
          f.selectableValues,
          questions.length,
        );
        if (item) questions.push(item);
      }
    return form({
      company: titleFrom(m.tenant!),
      title: str(d.title, 400)!,
      location: str(d.locationName, 1000),
      salary: str(d.scrapeableCompensationSalarySummary ?? d.compensationTierSummary, 500),
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      description: str(d.descriptionHtml),
      canonical_url: m.url.href,
      ats: m.ats,
      ats_tenant: m.tenant,
      ats_job_id: m.jobId,
      questions: questions.slice(0, 200),
    });
  },
};

const workable: Adapter = {
  match(url) {
    if (url.hostname.toLowerCase() !== 'apply.workable.com') return null;
    const m = url.pathname.match(/^\/([A-Za-z0-9][A-Za-z0-9_-]{0,80})\/j\/([A-Za-z0-9]{6,20})(?:\/apply)?\/?$/);
    if (!m) return null;
    const canonical = new URL(url);
    canonical.pathname = canonical.pathname.replace(/\/apply\/?$/, '');
    canonical.search = '';
    return { ats: 'workable', tenant: m[1]!, jobId: m[2]!, url: canonical };
  },
  async fetch(m) {
    const job = await json(
      `https://apply.workable.com/api/v1/accounts/${encodeURIComponent(m.tenant!)}/jobs/${encodeURIComponent(m.jobId!)}`,
      ObjectResponse,
    );
    const fields = await jsonValue(
      `https://apply.workable.com/api/v1/jobs/${encodeURIComponent(m.jobId!)}/form`,
      z.union([z.array(z.unknown()), ObjectResponse]),
    );
    if (!str(job.title)) throw new Error('Workable response did not contain a title');
    const questions = [];
    for (const section of arr(fields))
      for (const field of arr(asObject(section).fields)) {
        const f = asObject(field);
        const options = String(f.type ?? '').toLowerCase() === 'boolean' ? ['Yes', 'No'] : f.options;
        const item = question(`workable:${str(f.id, 300)}`, f.label, f.type, f.required, options, questions.length);
        if (item) questions.push(item);
      }
    const loc = asObject(job.location);
    return form({
      company: titleFrom(m.tenant!),
      title: str(job.title, 400)!,
      location: [str(loc.city, 100), str(loc.region, 100), str(loc.country, 100)].filter(Boolean).join(', ') || null,
      salary: str(job.salary, 500),
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      description:
        [str(job.description), str(job.requirements), str(job.benefits)].filter(Boolean).join('\n\n').slice(0, 30000) ||
        null,
      canonical_url: m.url.href,
      ats: m.ats,
      ats_tenant: m.tenant,
      ats_job_id: m.jobId,
      questions: questions.slice(0, 200),
    });
  },
};

const smartRecruiters: Adapter = {
  match(url) {
    if (url.hostname.toLowerCase() !== 'jobs.smartrecruiters.com') return null;
    const m = url.pathname.match(/^\/([A-Za-z0-9][A-Za-z0-9_.-]{0,80})\/(\d{6,20})(?:-[^/]*)?\/?$/);
    return m ? { ats: 'smartrecruiters', tenant: m[1]!, jobId: m[2]!, url } : null;
  },
  async fetch(m) {
    const d = await json(
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(m.tenant!)}/postings/${encodeURIComponent(m.jobId!)}`,
      ObjectResponse,
    );
    const loc = asObject(d.location);
    const sections = asObject(asObject(asObject(d.jobAd).sections));
    if (!str(d.name)) throw new Error('SmartRecruiters response did not contain a title');
    return form({
      company: str(asObject(d.company).name, 400) ?? titleFrom(m.tenant!),
      title: str(d.name, 400)!,
      location: [str(loc.city, 100), str(loc.region, 100), str(loc.country, 100)].filter(Boolean).join(', ') || null,
      salary: null,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      description:
        ['jobDescription', 'qualifications', 'additionalInformation', 'companyDescription']
          .map((k) => str(asObject(sections[k]).text))
          .filter(Boolean)
          .join('\n\n')
          .slice(0, 30000) || null,
      canonical_url: m.url.href,
      ats: m.ats,
      ats_tenant: m.tenant,
      ats_job_id: m.jobId,
      questions: [],
    });
  },
};

const bamboo: Adapter = {
  match(url) {
    const m = url.hostname.toLowerCase().match(/^([a-z0-9][a-z0-9_-]{0,80})\.bamboohr\.com$/);
    const job = url.pathname.match(/^\/careers\/(\d+)(?:\/.*)?$/);
    return m && job ? { ats: 'bamboohr', tenant: m[1]!, jobId: job[1]!, url } : null;
  },
  async fetch(m) {
    const d = await json(
      `https://${encodeURIComponent(m.tenant!)}.bamboohr.com/careers/${encodeURIComponent(m.jobId!)}/detail`,
      ObjectResponse,
    );
    const result = asObject(d.result);
    const opening = asObject(result.jobOpening);
    const loc = asObject(opening.location);
    if (!str(opening.jobOpeningName)) throw new Error('BambooHR response did not contain a title');
    const questions = [];
    for (const [key, value] of Object.entries(asObject(result.formFields))) {
      if (key === 'customQuestions') {
        for (const item of arr(value)) {
          const q = asObject(item);
          const options = String(q.type ?? '').toLowerCase() === 'yes_no' ? ['Yes', 'No'] : q.options;
          const custom = question(
            `bamboo:q${String(q.id ?? '')}`,
            q.question,
            q.type,
            q.isRequired,
            options,
            questions.length,
          );
          if (custom) questions.push(custom);
        }
        continue;
      }
      const f = asObject(value);
      const item = question(
        `bamboo:${key}`,
        f.label ?? key,
        key === 'customQuestions' ? 'text' : f.type,
        f.isRequired,
        f.options,
        questions.length,
      );
      if (item) questions.push(item);
    }
    return form({
      company: titleFrom(m.tenant!),
      title: str(opening.jobOpeningName, 400)!,
      location:
        [str(loc.city, 100), str(loc.state, 100), str(loc.addressCountry, 100)].filter(Boolean).join(', ') || null,
      salary: str(opening.compensation, 500),
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      description: str(opening.description),
      canonical_url: m.url.href,
      ats: m.ats,
      ats_tenant: m.tenant,
      ats_job_id: m.jobId,
      questions: questions.slice(0, 200),
    });
  },
};

const adapters = [greenhouse, lever, ashby, workable, smartRecruiters, bamboo];

async function parseHtmlQuestions(url: string) {
  const markup = await (await import('./common')).request(url, { accept: 'text/html,application/xhtml+xml' });
  const { document } = parseHTML(markup);
  return questionsFromDocument(document);
}

function questionsFromDocument(document: LinkedomDocument) {
  const questions = [];
  const inputs = [...document.querySelectorAll('input[name],select[name],textarea[name]')]
    .filter((element) => element.getAttribute('type') !== 'hidden')
    .slice(0, 200);
  const visited = new Set<string>();
  for (const [position, element] of inputs.entries()) {
    const name = element.getAttribute('name');
    if (!name || /csrf|token|captcha|password/i.test(name)) continue;
    const kind = (element.getAttribute('type') ?? element.tagName).toLowerCase();
    if (visited.has(name)) continue;
    visited.add(name);
    const id = element.getAttribute('id');
    const fieldset = element.closest('fieldset');
    const group =
      kind === 'radio' || kind === 'checkbox'
        ? inputs.filter((candidate) => candidate.getAttribute('name') === name)
        : [element];
    const label =
      fieldset?.querySelector('legend')?.textContent ??
      (id
        ? [...document.querySelectorAll('label')].find((candidate) => candidate.getAttribute('for') === id)?.textContent
        : null) ??
      element.closest('label')?.textContent ??
      element.getAttribute('aria-label') ??
      name;
    const type =
      kind === 'radio'
        ? 'radio'
        : kind === 'checkbox' && group.length > 1
          ? 'multiselect'
          : element.tagName.toLowerCase() === 'select'
            ? 'select'
            : element.tagName.toLowerCase() === 'textarea'
              ? 'textarea'
              : kind;
    const options =
      element.tagName.toLowerCase() === 'select'
        ? [...element.querySelectorAll('option')].map((o) => o.textContent?.trim() ?? '').filter(Boolean)
        : kind === 'radio' || kind === 'checkbox'
          ? group
              .map((input) => input.getAttribute('value') ?? input.closest('label')?.textContent?.trim() ?? '')
              .filter(Boolean)
          : [];
    const item = question(
      `html:${name}`,
      label,
      type,
      element.hasAttribute('required') || element.getAttribute('aria-required') === 'true' || /✱|\*/.test(label ?? ''),
      options,
      position,
    );
    if (item) questions.push(item);
  }
  return questions;
}

function jsonLdPosting(document: LinkedomDocument): Dict | null {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed: unknown = JSON.parse(script.textContent ?? 'null');
      const stack = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of stack) {
        const d = asObject(entry);
        if (
          String(d['@type'] ?? '')
            .split(/\s+/)
            .includes('JobPosting')
        )
          return d;
        for (const graph of arr(d['@graph']))
          if (String(asObject(graph)['@type'] ?? '').includes('JobPosting')) return asObject(graph);
      }
    } catch {
      /* Ignore malformed JSON-LD blocks. */
    }
  }
  return null;
}

async function htmlFallback(url: URL): Promise<ReturnType<typeof form>> {
  const { document } = parseHTML(
    await (await import('./common')).request(url.href, { accept: 'text/html,application/xhtml+xml' }),
  );
  const ld = jsonLdPosting(document) ?? {};
  const org = asObject(ld.hiringOrganization);
  const location = asObject(asObject(ld.jobLocation).address);
  const salary = asObject(ld.baseSalary);
  const value = asObject(salary.value);
  const range = salaryRange({ min: value.minValue, max: value.maxValue, currency: salary.currency });
  const title =
    str(
      ld.title ?? document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? document.title,
      400,
    ) ?? url.hostname;
  const company =
    str(org.name ?? document.querySelector('meta[property="og:site_name"]')?.getAttribute('content'), 400) ??
    titleFrom(url.hostname.split('.')[0]!);
  const questions = questionsFromDocument(document);
  const canonical = str(document.querySelector('link[rel="canonical"]')?.getAttribute('href'));
  const canonicalHref = canonical ? canonicalUrl(new URL(canonical, url).href).href : url.href;
  return form({
    company,
    title,
    location:
      [str(location.addressLocality, 100), str(location.addressRegion, 100), str(location.addressCountry, 100)]
        .filter(Boolean)
        .join(', ') || str(ld.jobLocation, 1000),
    ...range,
    description: str(ld.description ?? document.querySelector('meta[name="description"]')?.getAttribute('content')),
    canonical_url: canonicalHref,
    ats: 'custom',
    ats_tenant: null,
    ats_job_id: str(ld.identifier),
    questions,
  });
}

export function matchPostingUrl(url: URL): MatchedPosting | null {
  return adapters.map((adapter) => adapter.match(url)).find((match) => match !== null) ?? null;
}

export async function fetchPosting(rawUrl: string): Promise<ReturnType<typeof form>> {
  const url = canonicalUrl(rawUrl);
  const matched = adapters.map((adapter) => ({ adapter, match: adapter.match(url) })).find((x) => x.match);
  return matched ? matched.adapter.fetch(matched.match!) : htmlFallback(url);
}
