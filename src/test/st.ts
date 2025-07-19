import { useQuery } from "@tanstack/react-query";
import { q } from "../orm";
import { queryClient } from "..";
import { useReactQueryOrm } from "../lib";

export function useTest() {
  useReactQueryOrm(queryClient);

  useQuery(q.cluster("1"));
  useQuery(q.host("1"));
  useQuery(q.host("1"));
  useQuery(q.vm("1"));
  useQuery(q.clusters());
}
