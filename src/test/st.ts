import { useQuery } from "@tanstack/react-query";
import { q } from "../orm";
import { queryClient } from "..";
import { useReactQueryOrm } from "../lib";

export function useTest() {
  useReactQueryOrm(queryClient);

  const a = useQuery(q.cluster("1"));
  const b = useQuery({
    ...q.host("1"),
    enabled: !!a.data,
  });
  const c = useQuery({
    ...q.vm("1"),
    enabled: !!b.data,
  });
  useQuery({
    ...q.clusters(),
    enabled: !!b.data,
  });
  console.log(a.data, b.data, c.data);
}
