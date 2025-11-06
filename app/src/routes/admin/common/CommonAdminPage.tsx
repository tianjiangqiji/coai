import React from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";

export type CommonAdminPageProps = {
  title: string;
  children?: React.ReactNode;
  pro?: boolean;
};

function CommonAdminPage({ title, children, pro }: CommonAdminPageProps) {
  const { t } = useTranslation();

  return (
    <div className={`admin-container`}>
      <Card className={`admin-card`}>
        <CardHeader className={`select-none`}>
          <CardTitle className={`flex flex-row items-center`}>
            {t(`admin.${title}`)}

            {pro && (
              <Badge className={`ml-2`} variant={`gold`}>
                Pro
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

export default CommonAdminPage;
