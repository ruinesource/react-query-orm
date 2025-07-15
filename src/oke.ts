export const e = {
  cluster1: {
    host: {
      1: ["cluster"],
    },
  },
  host2: {
    cluster: {
      1: [
        ["deep", "host"],
        ["very", "deep", "host"],
      ],
    },
  },
  host3: {
    cluster: {
      1: ["host"],
    },
  },
  inner1: {
    cluster: {
      1: [
        ["deep", "arr", 1],
        ["very", "deep", "arr", 0],
      ],
    },
  },
  inner3: {
    cluster: {
      1: ["deep", "arr", 0],
    },
  },
  inner100: {
    host: {
      1: ["deep", "very", "inner"],
    },
  },
  vm1: {
    cluster: {
      1: ["vms", 1],
    },
    host: {
      1: ["vm"],
    },
  },
  vm2: {
    cluster: {
      1: ["vms", 0],
    },
  },
  vm100: {
    host: {
      1: ["vms", 0],
    },
  },
};
