import type { Metadata } from "next";
import { TodoApp } from "../app/TodoApp";

export const metadata: Metadata = {
  title: "Demo",
  description: "Try todone with sample lists, no account needed.",
};

export default function DemoPage() {
  return <TodoApp demo />;
}
