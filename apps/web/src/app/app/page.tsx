import type { Metadata } from "next";
import { TodoApp } from "./TodoApp";

export const metadata: Metadata = { title: "Your lists" };

export default function AppPage() {
  return <TodoApp />;
}
