import {
  getCluster,
  getClusters,
  getHost,
  getInner,
  getLocalStorages,
  getVm,
} from "./api";
import { one, many, reactQueryOrm } from "./lib";

const config = {
  cluster: one(
    getCluster,
    (res) => res.data,
    (x, res) => ({ data: { ...res.data, ...x } })
  ),
  clusters: many(
    getClusters,
    (res) => res.data,
    (data) => ({ data })
  ),
  host: one(
    getHost,
    (res) => res.data,
    (x, res) => ({ data: { ...res.data, ...x } })
  ),
  localStorages: many(
    getLocalStorages,
    (res) => res.data,
    (data) => ({ data })
  ),
  vm: one(
    getVm,
    (res) => res.data,
    (x, res) => ({ data: { ...res.data, ...x } })
  ),
  inner: one(
    getInner,
    (res) => res,
    (x) => x
  ),
};

export const { q } = reactQueryOrm(config, {
  cluster: {
    host: "host",
    vms: (x) => ["vm", x.id],
    deep: {
      host: "host",
      arr: (x) => ["inner", x.id],
    },
    very: {
      deep: {
        host: "host",
        arr: (x) => ["inner", x.id],
      },
    },
  },
  host: {
    cluster: "cluster",
    vm: "vm",
    vms: (x) => ["vm", x.id],
    deep: {
      very: {
        inner: "inner",
      },
    },
  },
  vm: {
    cluster: "cluster",
    host: "host",
  },
  inner: {},
  clusters: (x) => ["cluster", x.id],
});
