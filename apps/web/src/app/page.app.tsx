import type { Metadata } from "next";
import { TodoApp } from "./app/TodoApp";

export const metadata: Metadata = { title: "Your lists" };

// app.todone.today opens on your lists (/app shows the same, for links made before the app had its own address).
export default function AppHome() {
  return <TodoApp />;
}
