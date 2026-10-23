import { ComingSoon } from '../components/ComingSoon';
import { useTheme } from '../lib/theme';

export function Extension() {
  useTheme();
  return <ComingSoon title="Extension" arrival="the browser extension" />;
}
