import { useQuery } from "@tanstack/react-query";
import { one, reactQueryOrm } from "../lib";
import { queryClient } from "..";
import { useEffect } from "react";

export function useTest() {
  useEffect(() => sub(queryClient), []);

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
    (x, res) => ({ data: { ...res.data, ...x } })
  ),
  b: one(
    getB,
    (res) => res.data,
    (x, res) => ({ data: { ...res.data, ...x } })
  ),
  c: one(
    getC,
    (res) => res.data,
    (x, res) => ({ data: { ...res.data, ...x } })
  ),
};

const { q, sub } = reactQueryOrm(config, {
  a: {
    b: "b",
  },
  b: {
    c: "c",
  },
  c: {},
});

function getA(id: string) {
  return Promise.resolve({
    data: {
      id,
      b: {
        id: "1",
      },
    },
  });
}

function getB(id: string) {
  return Promise.resolve({
    data: {
      id,
      c: {
        id: "1",
      },
    },
  });
}

function getC(id: string) {
  return {
    data: {
      id,
      e: "new prop",
    },
  };
}
