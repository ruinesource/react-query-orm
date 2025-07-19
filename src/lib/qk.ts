export function qkString(x: any[]) {
  return x[0] + "!+|" + x[1];
}

export function qkArgString(value: any): string {
  if (Array.isArray(value)) {
    return `[${value.map(qkArgString).join(",")}]`;
  } else if (value && value.constructor === Object) {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map(
        (key) => `${JSON.stringify(key)}:${qkArgString((value as any)[key])}`
      )
      .join(",")}}`;
  } else {
    return JSON.stringify(value);
  }
}
