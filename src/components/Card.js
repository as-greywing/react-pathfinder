import React from "react";
import cx from "classnames";

const Card = ({ children, className, ...props }) => {
  return (
    <div className={cx("card", className)} {...props}>
      {children}
    </div>
  );
};

const CardBody = ({ children }) => {
  return <div className="card-body">{children}</div>;
};

const CardFooter = ({ children }) => (
  <div className="card-footer">{children}</div>
);

const GenericCard = ({ children, footer, ...props }) => (
  <Card {...props}>
    <CardBody>{children}</CardBody>
    {footer && <CardFooter>{footer}</CardFooter>}
  </Card>
);

export default GenericCard;
