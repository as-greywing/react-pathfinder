import React from "react";
import cx from "classnames";

export const Card = ({ children, className, ...props }) => {
  return (
    <div className={cx("card", className)} {...props}>
      {children}
    </div>
  );
};

const CardBody = ({ children, style }) => {
  return (
    <div className="card-body" style={style}>
      {children}
    </div>
  );
};

const CardFooter = ({ children }) => (
  <div className="card-footer">{children}</div>
);

const GenericCard = ({ children, footer, bodyStyle, ...props }) => (
  <Card {...props}>
    <CardBody style={bodyStyle}>{children}</CardBody>
    {footer && <CardFooter>{footer}</CardFooter>}
  </Card>
);

export default GenericCard;
