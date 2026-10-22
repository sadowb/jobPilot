// Speed lines trailing Cap's dart. They only animate inside a `.v17` screen (the wrapper the screens put around their content) and fade
// out a second after a `.v17-land` / `.v17-lift` flight starts. `v17gust` / `v17gustoff` keyframes live in styles/motion.css.
// The second line starts 0.2s late; that delay also replaces the fade-out delay, as the old inline `animationDelay` did.
const BASE = '[.v17_&]:[stroke-dasharray:8_5] motion-reduce:[.v17_&]:opacity-0!';

export const GUST_LINE = `${BASE} [.v17_&]:animate-[v17gust_0.5s_linear_infinite] [.v17_.v17-land_&]:animate-[v17gust_0.5s_linear_infinite,v17gustoff_0.01s_linear_1s_forwards] [.v17_.v17-lift_&]:animate-[v17gust_0.5s_linear_infinite,v17gustoff_0.01s_linear_1s_forwards]`;

export const GUST_LINE_LATE = `${BASE} [.v17_&]:animate-[v17gust_0.5s_linear_.2s_infinite] [.v17_.v17-land_&]:animate-[v17gust_0.5s_linear_.2s_infinite,v17gustoff_0.01s_linear_.2s_forwards] [.v17_.v17-lift_&]:animate-[v17gust_0.5s_linear_.2s_infinite,v17gustoff_0.01s_linear_.2s_forwards]`;
