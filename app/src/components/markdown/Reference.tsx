import React from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReferenceProps {
  url: string;
  children: React.ReactNode;
}

export function Reference({ url, children }: ReferenceProps): JSX.Element {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Badge 
      variant="outline" 
      className="reference-badge inline-flex items-center py-1 px-2 gap-1.5 
                hover:bg-primary/10 cursor-pointer transition-colors 
                rounded-md border border-primary/30 text-primary-foreground
                bg-primary/5 font-normal text-xs"
      onClick={handleClick}
    >
      <ExternalLink className="h-3 w-3" />
      {children}
    </Badge>
  );
}
