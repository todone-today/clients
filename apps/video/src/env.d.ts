// CSS imports, as Next.js types them for the web app.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
declare module "*.css";
