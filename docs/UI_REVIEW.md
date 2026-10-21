# Desktop UI review

Reviewed the 15 implemented views below in Light and Dark at 1440×960 and the
minimum supported desktop content size, 1024×680. This is a visual and interaction
smoke review, not a pixel comparison against all 67 design boards.

| View                    | Route                        |
| ----------------------- | ---------------------------- |
| Applied applications    | `/`                          |
| Up next queue           | `/?tab=up-next`              |
| Inbox                   | `/inbox`                     |
| Manual control examples | `/fixes`                     |
| Analytics               | `/analytics`                 |
| About me                | `/profile`                   |
| Documents               | `/profile?section=documents` |
| Settings                | `/settings`                  |
| First-day dashboard     | `/first-day`                 |
| Welcome                 | `/welcome/1`                 |
| CV setup                | `/welcome/2`                 |
| First job links         | `/welcome/3`                 |
| Setup questions         | `/welcome/4`                 |
| Liftoff                 | `/welcome/5`                 |
| Extension preview       | `/extension`                 |

## Fixed in this pass

- Removed the redundant logo/home link from macOS app and onboarding headers.
  Navigation and setup progress keep their centered positions; native traffic lights
  keep their reserved area. The Mac toolbar is now 56px high, with controls at
  (16, 22), and stays visible when a long page scrolls. Settings and profile sheets
  open below the toolbar; viewport layouts use its actual height.
- Welcome's fixed 720px illustration column squeezed text into individual words at
  minimum width. It now shares available width with the introduction.
- Inbox's three columns left almost no space for chat at minimum width. Below
  1194px, Conversation and Details/review share one pane, following the tablet
  design's tab pattern. Thread lists and review panels scroll instead of squeezing
  rows or hiding actions in short windows.
- Up next's title and queue actions clipped at minimum width. The toolbar now wraps.
- Applied status filters were cut off. They now remain reachable with scrolling and
  use a separate toolbar row when space is tight.
- Application peek overlays the table at smaller widths instead of crushing it.
- The CV dialog now clears the Mac title-bar controls.
- Documents stacks its supporting-document and agent-knowledge panels at smaller widths,
  so action buttons no longer squeeze fact text into a narrow column.
- Manual control uses two columns at smaller widths instead of four cramped cards.

## Interaction states checked

Add jobs, Ask Cap, application peek, CV viewer, Inbox draft review, takeover/hand-back,
consent, and the pilot thread. Long-page bottoms were also reviewed for Documents,
Analytics, Manual control, Settings, and common answers.

## Remaining prototype behavior

These layout checks do not make the sample workflows into a connected product:

- Onboarding CV replacement and extraction still use sample data.
- Extension capture and the live job tab are simulations.
- Several Manual control and document-template actions remain static examples.
- Ask Cap's command execution is not connected to the job queue.
- Analytics ranges change the caption over the same sample dataset.
- Profile details, common answers, and uploaded documents save locally. Agent sync
  is not connected.
