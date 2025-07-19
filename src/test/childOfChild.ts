import { useQuery } from "@tanstack/react-query";
import { one, reactQueryOrm, useReactQueryOrm } from "../lib";
import { queryClient } from "..";

export function useTest() {
  useReactQueryOrm(queryClient);

  const a = useQuery(q.a("1"));
  const b = useQuery({
    ...q.b("1"),
    enabled: !!a.data,
  });
  useQuery({
    ...q.c("1"),
    enabled: !!b.data,
  });
}

const config = {
  a: one(
    getA,
    (res) => res.data,
    (x, res) => ({ data: { ...res.data, ...x } }),
    (x) => ({ data: x })
  ),
  b: one(
    getB,
    (res) => res.data,
    (x, res) => ({ data: { ...res.data, ...x } }),
    (x) => ({ data: x })
  ),
  c: one(
    getC,
    (res) => res.data,
    (x, res) => ({ data: { ...res.data, ...x } }),
    (x) => ({ data: x })
  ),
};

const { q } = reactQueryOrm(config, {
  a: {
    b: "b",
  },
  b: {
    c: "c",
  },
  c: {},
});

async function getA(id: string) {
  await delay(0);
  return {
    data: {
      id,
      b: {
        id: "1",
      },
    },
  };
}

async function getB(id: string) {
  await delay(200);
  return {
    data: {
      id,
      c: {
        id: "1",
      },
    },
  };
}

async function getC(id: string) {
  await delay(400);
  return {
    data: {
      id,
      e: "new prop",
    },
  };
}

function delay(ms = 200) {
  return new Promise((res) => setTimeout(res, ms));
}
