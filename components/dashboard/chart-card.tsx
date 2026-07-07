import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, description, children, className }: ChartCardProps) {
  return (
    <Card className={className || "bg-white"}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg font-bold">{title}</CardTitle>
        {description && <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-2 sm:px-6">{children}</CardContent>
    </Card>
  );
}
