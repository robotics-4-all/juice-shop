// Credit for the implementation in JS: https://github.com/daviddossantos/sequelize-notupdate-attributes
import { type Model } from 'sequelize/types'
import { type ValidationOptions } from 'sequelize/types/instance-validator'
import { ValidationError, ValidationErrorItem } from 'sequelize'

interface ExtendedValidationOptions extends ValidationOptions {
  validate: boolean
}

interface ExtendedModel extends Model {
  _changed: Iterable<string> | ArrayLike<string>
  rawAttributes: Record<string, { fieldName: string }>
  _previousDataValues: Record<string, unknown>
}

export const makeKeyNonUpdatable = (model: Model, column: string) => {
  model.addHook('beforeValidate', (instance: ExtendedModel, options: ExtendedValidationOptions) => {
    if (!options.validate) return

    if (instance.isNewRecord) return

    const changedKeys: string[] = []

    const instanceChanged = Array.from(instance._changed)

    instanceChanged.forEach((value) => changedKeys.push(value))

    if (changedKeys.length === 0) return

    const validationErrors: ValidationErrorItem[] = []

    changedKeys.forEach((fieldName: string) => {
      const fieldDefinition = instance.rawAttributes[fieldName]

      if (
        instance._previousDataValues[fieldName] !== undefined &&
        instance._previousDataValues[fieldName] !== null &&
        fieldDefinition.fieldName === column
      ) {
        validationErrors.push(
          new ValidationErrorItem(
            `\`${fieldName}\` cannot be updated due \`noUpdate\` constraint`,
            'validation error',
            fieldName,
            instance.toString(),
            instance,
            '',
            '',
            []
          )
        )
      }
    })

    if (validationErrors.length > 0) {
      throw new ValidationError('', validationErrors)
    }
  })
}
