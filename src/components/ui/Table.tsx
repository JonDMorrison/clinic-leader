import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
}

export const Table = ({ children, className }: TableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full", className)}>
        {children}
      </table>
    </div>
  );
};

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export const TableHeader = ({ children, className }: TableHeaderProps) => {
  return (
    <thead className={cn("border-b border-border", className)}>
      {children}
    </thead>
  );
};

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export const TableBody = ({ children, className }: TableBodyProps) => {
  return <tbody className={className}>{children}</tbody>;
};

interface TableRowProps {
  children: ReactNode;
  className?: string;
}

export const TableRow = ({ children, className }: TableRowProps) => {
  return (
    <tr className={cn("border-b border-border hover:bg-muted/50 transition-colors", className)}>
      {children}
    </tr>
  );
};

interface TableHeadProps {
  children: ReactNode;
  className?: string;
}

export const TableHead = ({ children, className }: TableHeadProps) => {
  return (
    <th className={cn("text-left py-3 px-4 text-sm font-medium text-muted-foreground", className)}>
      {children}
    </th>
  );
};

interface TableCellProps {
  children: ReactNode;
  className?: string;
}

export const TableCell = ({ children, className }: TableCellProps) => {
  return (
    <td className={cn("py-3 px-4 text-sm text-foreground", className)}>
      {children}
    </td>
  );
};
