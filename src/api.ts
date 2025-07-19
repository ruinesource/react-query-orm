export async function getCluster(id: string) {
  await delay(0);
  return {
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
  };
}

export async function getHost(id: string) {
  await delay(200);
  return {
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
  };
}

export async function getVm(id: string) {
  await delay(400);
  return {
    data: {
      e: "vmm",
      id,
      cluster: { id: "1" },
      host: { id: "1", e: "hostt" },
    },
  };
}

export async function getClusters() {
  await delay(600);
  return {
    data: [{ oki: "doki", id: "1", vms: [{ id: "1", e: "a" }] }],
  };
}

export async function getInner() {
  await delay(800);
  return { id: "1", e: "inner" };
}

export async function getLocalStorages(hostId: string) {
  await delay(1000);
  return {
    data: { e: "d" },
  };
}

function delay(ms = 200) {
  return new Promise((res) => setTimeout(res, ms));
}
