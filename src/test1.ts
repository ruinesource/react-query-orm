import { useQuery } from "@tanstack/react-query";

function delay(ms = 200) {
  return new Promise((res) => setTimeout(res, ms));
}

export function useTest() {
  const asc = useClusters();
  const desc = useClustersDesc(!!asc.data);
  useHost("1", !!desc.data);
}

function getCluster(id: string) {
  return {
    e: "cluster" + id,
    id,
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
  };
}

function getUpdatedCluster(id: string) {
  return {
    data: {
      id,
      e: "host_2",
      vm: {
        id: "1",
        e: "vm_updated",
      },
      vms: [{ id: "1", e: "vm_updated" }],
      cluster: {
        id: "1",
        e: "cluster_2",
        vms: [
          { id: "2", e: "vm2_2" },
          { id: "1", e: "vm_updated" },
        ],
      },
    },
  };
}

function useClusters() {
  return useQuery({
    queryKey: ["clusters", { sort: { host: "asc" } }],
    queryFn: async () => {
      await delay();
      return {
        data: [
          getCluster("1"),
          getCluster("2"),
          getCluster("3"),
          getCluster("4"),
        ],
      };
    },
  });
}

function useClustersDesc(enabled: boolean) {
  return useQuery({
    queryKey: ["clusters", { sort: { host: "desc" } }],
    enabled,
    queryFn: async () => {
      await delay();
      return { data: [getCluster("3"), getCluster("2"), getCluster("5")] };
    },
  });
}

function useHost(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["host", id],
    enabled,
    queryFn: async () => {
      await delay();
      return getUpdatedCluster(id);
    },
  });
}
