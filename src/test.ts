import { useQuery } from "@tanstack/react-query";

export function useTest() {
  const c = useQuery({
    queryKey: ["cluster", "1"],
    queryFn: async () => {
      return getCluster("1");
    },
  });
  const r = useQuery({
    queryKey: ["host", "1"],
    queryFn: async () => {
      await delay(200);
      return getHost("1");
    },
  });
}

function getCluster(id: string) {
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
        vms: [{ id: "2", e: "vm2" }],
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
      id: "1",
    },
  });
}

function getHost(id: string) {
  return Promise.resolve({
    data: {
      id: "1",
      host: "host",
      e: "host_2",
      vm: {
        id: "1",
        e: "vm_2",
        vm: "vm",
      },
      cluster: {
        id: "1",
        e: "cluster_2",
        cluster: "cluster",
        vms: [
          { id: "2", e: "vm2_2", vm: "vm" },
          { id: "1", e: "vm_2", vm: "vm" },
        ],
        deep: {
          e: "deep_2",
          arr: [
            { id: "3", e: "inner3_2" },
            { id: "1", e: "inner_2" },
          ],
        },
        very: {
          deep: {
            arr: [],
          },
        },
      },
    },
  });
}

function delay(ms: number = 200) {
  return new Promise((r) => setTimeout(() => r(1), ms));
}
