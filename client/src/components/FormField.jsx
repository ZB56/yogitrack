/**
 * client/src/components/FormField.jsx
 * -----------------------------------
 * One labelled form input, with its hint and its error message.
 *
 * UC1 and UC4 collect the same six fields, and UC3 adds more, so the label /
 * input / error arrangement is written once here and reused. Getting the
 * accessibility wiring right once is the other reason: the label is tied to
 * the input by id, and the error is announced because aria-describedby points
 * at it.
 */

/**
 * A text, email, tel, number or date input.
 *
 * @param {object} props
 * @param {string} props.name - matches the key in the form's state object
 * @param {string} props.label - visible label text
 * @param {string} props.value - the current value (this is a controlled input)
 * @param {Function} props.onChange - receives the DOM change event
 * @param {string} [props.type='text'] - HTML input type
 * @param {boolean} [props.required]
 * @param {string} [props.error] - message to show beneath the input
 * @param {string} [props.hint] - guidance shown when there is no error
 * @param {boolean} [props.fullWidth] - span both grid columns
 */
export default function FormField({
  name,
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  error,
  hint,
  fullWidth = false,
  ...inputProps
}) {
  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className={`field${fullWidth ? ' field--full' : ''}`}>
      {/* htmlFor is JSX's name for the HTML `for` attribute (`for` is a
          reserved word in JavaScript). It links the label to the input, so
          clicking the label focuses the field and a screen reader reads the
          two together. */}
      <label className="field__label" htmlFor={inputId}>
        {label}
        {required && <span className="field__required" aria-hidden="true">*</span>}
      </label>

      <input
        id={inputId}
        name={name}
        type={type}
        // A "controlled input": React state holds the value and the input just
        // displays it. Every keystroke calls onChange, which updates state,
        // which re-renders the input. Unlike a Swing text field, the DOM
        // element is never the source of truth.
        value={value}
        onChange={onChange}
        className={`field__input${error ? ' field__input--invalid' : ''}`}
        // Tells assistive technology the field is in an error state, which
        // the red border alone only communicates to people who can see it.
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        {...inputProps}
      />

      {error ? (
        <span className="field__error" id={errorId}>{error}</span>
      ) : (
        hint && <span className="field__hint" id={hintId}>{hint}</span>
      )}
    </div>
  );
}
