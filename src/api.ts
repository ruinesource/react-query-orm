export function getClusters() {
  return Promise.resolve({
    data: [{ oki: "doki", id: "1", vms: [{ id: "1", e: "a" }] }],
  });
}

export function getClusterss() {
  return Promise.resolve({
    data: [
      { oki: "doki", id: "1", vms: [{ id: "1" }] },
      { oki: "doki", id: "2", vms: [{ id: "1" }] },
    ],
  });
}

export function getCluster(id: string) {
  return Promise.resolve({
    data: {
      e: "cluster",
      vms: [
        { id: "1", e: "vm" },
        { id: "2", e: "vm2" },
      ],
      host: {
        id: "1",
        e: "host",
        vm: { id: "1", e: "vm" },
        vms: [
          { id: "1", e: "vm" },
          { id: "2", e: "vm2" },
        ],
      },
      deep: {
        e: "deep",
        host: { id: "2", e: "host2" },
        arr: [
          { id: "1", e: "inner" },
          { id: "2", e: "inner2" },
          { id: "3", e: "inner3" },
        ],
      },
      very: {
        deep: {
          host: { id: "1", e: "host" },
          arr: [
            { id: "3", e: "inner3" },
            { id: "2", e: "inner2" },
            { id: "1", e: "inner" },
          ],
        },
      },
      id,
    },
  });
}

export function getHost(id: string) {
  return Promise.resolve({
    data: {
      id,
      host: "host_2",
      e: "host_2",
      vm: {
        id: "1",
        e: "vm_2",
        vm: "vm_2",
      },
      vms: [{ id: "100" }],
      deep: {
        very: {
          inner: { id: "100" },
        },
      },
      cluster: {
        id: "1",
        e: "cluster_2",
        cluster: "cluster_2",
        vms: [
          { id: "2", e: "vm2_2", vm: "vm_2" },
          { id: "1", e: "vm_2", vm: "vm_2" },
        ],
        host: { id: "3", e: "host3_2" },
        deep: {
          e: "deep_2",
          arr: [
            { id: "3", e: "inner3_2" },
            { id: "1", e: "inner_2" },
          ],
        },
        very: {
          deep: {
            host: { id: "2" },
            arr: [{ id: "1", e: "inner_2" }],
          },
        },
      },
    },
  });
}

export function getInner() {
  return { id: "1", e: "inner" };
}

export function getVm(id: string) {
  return Promise.resolve({
    data: {
      e: "vmm",
      id,
      cluster: { id: "1" },
      host: { id: "1", e: "hostt" },
    },
  });
}

export function getLocalStorages(hostId: string) {
  return Promise.resolve({
    data: { e: "d" },
  });
}
