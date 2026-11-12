"use client";

import { createContext } from "react";

/** The mobile footer hosts the active product's existing workspace tabs. */
export const WorkspaceNavigationTarget = createContext<HTMLElement | null>(null);
