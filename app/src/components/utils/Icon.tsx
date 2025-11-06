import React from "react";

type Icon = {
  icon: React.ReactElement | JSX.Element | React.ReactNode;
  className?: string;
  id?: string;
} & React.SVGProps<SVGSVGElement>;

function Icon({ icon, className, id, ...props }: Icon) {
  return React.cloneElement(icon as React.ReactElement, {
    className: className,
    id: id,
    ...props,
  });
}

export default Icon;
