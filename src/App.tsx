import { useEffect } from "react";
import { q, sub } from "./orm";
import { useTest } from "./test";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from ".";

function App() {
  useEffect(() => sub(queryClient), []);
  useTest();
  useQuery(q.cluster("1"));
  useQuery(q.host("1"));
  useQuery(q.cluster("1"));
  useQuery(q.host("1"));
  useQuery(q.vm("1"));
  useQuery(q.clusters());
  return <></>;
}

export default App;
