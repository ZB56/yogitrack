/**
 * client/src/components/RadioGroup.jsx
 * ------------------------------------
 * A set of mutually exclusive choices, e.g. the preferred contact method in
 * UC1 and UC4, or the package category in UC3.
 *
 * Radio buttons rather than a dropdown: with only two or three options, every
 * choice is visible at once and is a single tap on a phone.
 */

/**
 * @param {object} props
 * @param {string} props.name - shared input name; what makes them exclusive
 * @param {string} props.legend - the question these options answer
 * @param {Array<{value: string, label: string}>} props.options
 * @param {string} props.value - the currently selected value
 * @param {Function} props.onChange - receives the DOM change event
 * @param {boolean} [props.required]
 * @param {string} [props.error]
 */
export default function RadioGroup({
  name,
  legend,
  options,
  value,
  onChange,
  required = false,
  error,
}) {
  const errorId = `${name}-error`;

  return (
    // <fieldset> and <legend> are the correct grouping elements for a set of
    // related inputs: a screen reader reads the legend before each option, so
    // "Email" is announced as "Preferred contact method: Email".
    <fieldset
      className="field field--full"
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="field__label">
        {legend}
        {required && <span className="field__required" aria-hidden="true">*</span>}
      </legend>

      <div className="radio-group">
        {options.map((option) => (
          <label
            key={option.value}
            className={`radio${value === option.value ? ' radio--checked' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              // `checked` is driven by state, the same controlled-input idea
              // as in FormField: React decides what is selected, not the DOM.
              checked={value === option.value}
              onChange={onChange}
            />
            {option.label}
          </label>
        ))}
      </div>

      {error && <span className="field__error" id={errorId}>{error}</span>}
    </fieldset>
  );
}
