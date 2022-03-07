import { useField } from "formik";

const InputField = (props) => {
  const [field, meta] = useField(props);
  const isInvalid = meta.touched && meta.error;
  return (
    <>
      <input className="form-control" {...field} {...props} />
      {isInvalid && <p>{meta.error}</p>}
    </>
  );
};

export default InputField;
