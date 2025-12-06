export const clamp = (value: number, min = 0, max = 10) => Math.min(Math.max(value, min), max);

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
