import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode | React.ComponentType<any>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return null;
    // If icon is a component type (function/class), render it with className
    if (typeof icon === "function") {
      const IconComponent = icon as React.ComponentType<any>;
      return (
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <IconComponent className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      );
    }
    // Otherwise assume it's a React node (element) and render directly
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-muted p-4">
          {icon}
        </div>
      </div>
    );
  };

  return (
    <Card className={`text-center py-12 ${className}`}>
      <CardContent className="space-y-4">
        {renderIcon()}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {description}
          </p>
        </div>
        {action && (
          <Button onClick={action.onClick} className="mt-4">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
