import type { ComponentType, ReactNode } from "react";

declare module "*.mdx" {
  const MDXComponent: ComponentType<{
    components?: Record<string, ComponentType>;
    children?: ReactNode;
  }>;
  export default MDXComponent;
}
