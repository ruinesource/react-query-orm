export function qkString(x: any[]) {
  return x[0] + "|" + x[1];
}

export function qkArgString(arg: any): string {
  if (Array.isArray(arg)) return `[${arg.map(qkArgString).join(",")}]`;
  else if (arg && arg.constructor === Object) {
    return `{${Object.keys(arg)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${qkArgString((arg as any)[key])}`)
      .join(",")}}`;
  } else return JSON.stringify(arg);
}
