/** Probe: does LangGraph v1.4.8 persist `error` set by one node and route via conditional edges? */
require("@langchain/langgraph/zod");
const { z } = require("zod");
const { StateGraph, END } = require("@langchain/langgraph");

const PostState = z.object({
  postId: z.string().optional(),
  caption: z.string().optional(),
  igMediaId: z.string().optional(),
  error: z.string().optional(),
  failedStage: z.string().optional(),
});

async function nodeA(state) {
  console.log(">> nodeA invoked, postId:", state.postId);
  return { caption: "hello" };
}
async function nodeB(state) {
  console.log(">> nodeB invoked, caption:", state.caption);
  // simulate a publish failure
  return { error: "The caption was too long.", failedStage: "media_container" };
}
async function nodeC(state) {
  console.log(">> nodeC invoked, error:", state.error, "failedStage:", state.failedStage);
  return { igMediaId: "123" };
}
async function finalize(state) {
  console.log(">> finalize invoked, error:", state.error, "failedStage:", state.failedStage, "igMediaId:", state.igMediaId);
  if (state.error) {
    console.log("[finalize] FAILED path ->", state.failedStage, state.error);
  } else {
    console.log("[finalize] SUCCESS path ->", state.igMediaId);
  }
  return {};
}

function routeAfter(nextNode) {
  return (state) => (state.error ? "finalize" : nextNode);
}

async function main() {
  const graph = new StateGraph(PostState)
    .addNode("a", nodeA)
    .addNode("b", nodeB)
    .addNode("c", nodeC)
    .addNode("finalize", finalize)
    .addEdge("__start__", "a")
    .addConditionalEdges("a", routeAfter("b"))
    .addConditionalEdges("b", routeAfter("c"))
    .addConditionalEdges("c", routeAfter("finalize"))
    .addEdge("finalize", END);

  const app = graph.compile();
  const state = await app.invoke({ postId: "x" });
  console.log("FINAL STATE:", state);
}

main();