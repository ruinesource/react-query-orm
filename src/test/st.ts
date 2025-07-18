import { useQuery } from "@tanstack/react-query";
import { q, sub } from "../orm";
import { useEffect } from "react";
import { queryClient } from "..";

export function useTest() {
  useEffect(() => sub(queryClient), []);

  useQuery(q.cluster("1"));
  useQuery(q.host("1"));
  useQuery(q.cluster("1"));
  useQuery(q.host("1"));
  useQuery(q.vm("1"));
  useQuery(q.clusters());
}
