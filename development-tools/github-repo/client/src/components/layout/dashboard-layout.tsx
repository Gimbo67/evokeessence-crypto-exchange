import React from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface PanelConfig {
  id?: string;
  minSize?: number;
  defaultSize?: number;
  title?: string;
  children?: React.ReactNode;
  content?: React.ReactNode;
}

interface DashboardLayoutProps {
  panels: PanelConfig[];
  direction?: "horizontal" | "vertical";
  className?: string;
}

export function DashboardLayout({ 
  panels, 
  direction = "horizontal",
  className 
}: DashboardLayoutProps) {
  const [sizes, setSizes] = useLocalStorage<number[]>(
    `dashboard-layout-${direction}`,
    panels.map(p => p.defaultSize || 100 / panels.length)
  );

  return (
    <ResizablePanelGroup
      direction={direction}
      className={cn(
        "min-h-[200px] max-w-full rounded-lg border", 
        className
      )}
      onLayout={(sizes) => setSizes(sizes)}
    >
      {panels.map((panel, index) => (
        <React.Fragment key={panel.id || index}>
          <ResizablePanel
            defaultSize={sizes[index] || panel.defaultSize || 100 / panels.length}
            minSize={panel.minSize || 10}
            className="p-3"
          >
            <Card className="h-full overflow-hidden">
              <div className="h-full p-4 overflow-auto">
                {panel.title && <h3 className="font-medium mb-2">{panel.title}</h3>}
                {panel.content || panel.children}
              </div>
            </Card>
          </ResizablePanel>
          {index < panels.length - 1 && (
            <ResizableHandle className="w-2 bg-muted-foreground/10 hover:bg-muted-foreground/20 transition-colors" />
          )}
        </React.Fragment>
      ))}
    </ResizablePanelGroup>
  );
}