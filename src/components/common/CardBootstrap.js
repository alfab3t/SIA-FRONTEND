import PropTypes from "prop-types";

function Card({ children, className = "" }) {
  return (
    <div className={`card shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ children, className = "" }) {
  return (
    <div className={`card-header ${className}`}>
      {children}
    </div>
  );
}

function CardBody({ children, className = "" }) {
  return (
    <div className={`card-body ${className}`}>
      {children}
    </div>
  );
}

function CardFooter({ children, className = "" }) {
  return (
    <div className={`card-footer ${className}`}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

CardHeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

CardBody.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

CardFooter.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Card;