/**
 * THE DESIGN SYSTEM, OURS. The components are ported from the prototype's bundle
 * (reference/bundle.js, never edited) to React 19, and held markup-identical to it by
 * parity.test.tsx (Decision 2). Its stylesheets live in this folder and are fixed at source
 * (Rich, F1 sitting 5). F1 ports the four its slice needs; each later plan ports the ones its
 * screens need.
 */
export { Button, type ButtonProps } from './Button.js'
export { Card, type CardProps } from './Card.js'
export { Choice, type ChoiceOption, type ChoiceProps } from './Choice.js'
export {
  FormField,
  type FieldMessage,
  type FormFieldProps,
  type Tone,
} from './FormField.js'
export { LiveSteps, type LiveStepsProps, type Step } from './LiveSteps.js'
export { SideNav, type NavItem, type SideNavProps } from './SideNav.js'
export { StateChip, type State, type StateChipProps } from './StateChip.js'
export { MARK, TICK } from './icons.js'
export { PERSON } from './icons.js'
