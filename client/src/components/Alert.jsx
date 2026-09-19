/**
 * client/src/components/Alert.jsx
 * -------------------------------
 * A coloured message box: success, error, warning or information.
 *
 * Written once and reused by every page so that a confirmation looks the same
 * everywhere. Java analogy: a small reusable UI widget class.
 */

/**
 * @param {object} props
 * @param {'success'|'error'|'warning'|'info'} props.variant - which colour
 * @param {string} [props.title] - bold first line
 * @param {React.ReactNode} props.children - the body of the message
 */
export default function Alert({ variant = 'info', title, children }) {
  // An error should interrupt a screen reader immediately; a success message
  // should wait until it finishes the current sentence. That is the difference
  // between assertive and polite, and role="alert" implies assertive.
  const isUrgent = variant === 'error' || variant === 'warning';

  return (
    <div
      className={`alert alert--${variant}`}
      role={isUrgent ? 'alert' : 'status'}
    >
      {title && <div className="alert__title">{title}</div>}
      {children}
    </div>
  );
}
