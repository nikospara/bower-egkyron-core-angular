angular.module('egkyron', []);

angular.module('egkyron').factory('Constraint', [function() {

/* exported Constraint */
/**
 * Descriptor of a constraint.
 *
 * @constructor
 */
function Constraint(key, validator, params) {
	/**
	 * The key of this constraint.
	 * @member {string}
	 */
	this.key = key;
	/**
	 * The validator function.
	 * @member {Constraint~validator}
	 */
	this.validator = validator;
	/**
	 * Any parameterizations to the validation logic. Some params are standard, i.e. handled by the infrastructure:
	 * <ul>
	 *   <li><code>condition</code>: A function taking the same arguments as the validator; if present it will be called
	 *       <em>before</em> the validator and, if it returns <code>false</code>, will bypass calling the validator
	 *       altogether. Note that it has to return a literal <code>false</code>, not a falsey value.</li>
	 * </ul>
	 *
	 * @member {Object}
	 */
	this.params = params;
}

/**
 * A validator function. Called with <code>this</code> pointing to the object containing the value being validated.
 *
 * @callback Constraint~validator
 * @param {any} value - The value to validate.
 * @param {Object} validationParameters - The validation parameters.
 * @param {ValidationContext} validationContext - The validation context.
 * @returns {boolean} - The validity flag, <code>true</code> if the value is valid.
 */

/**
 *
 */
return Constraint;
}]);

/**
 * @ngdoc type
 * @name egkyron.ValidateController
 *
 * @description
 * A controller to use in validation directives.
 */
angular.module('egkyron').controller('ValidateController', ['$scope', '$attrs', 'ValidationContext', function ValidateController($scope, $attrs, ValidationContext) {

	var
		unwatch,
		ngModel,
		processedModelExpression,
		validator,
		EMPTY_OBJECT = {},
		controller = this,
		type = null,
		childType = null,
		propName = null;

	/**
	 * @ngdoc method
	 * @name egkyron.ValidateController#configure
	 *
	 * @description
	 * Provide the controller with the required and optional dependencies.
	 *
	 * @param {NgModelController} ngModelValue - The `NgModelController`
	 * @param {Validator} validatorValue - The validator to use (see the `validator` directive)
	 * @param {ValidateController} parentValidate - The validator to use (see the `validator` directive)
	 */
	function configure(ngModelValue, validatorValue, parentValidate) {
		ngModel = ngModelValue;
		validator = validatorValue;

		if( !ngModel ) {
			throw new Error('the ngModel is required');
		}
		if( !validator ) {
			throw new Error('the validator is required');
		}

		processedModelExpression = validator.introspectionStrategy.processModelExpression($attrs.ngModel);
		ngModel.$validators.validate = validate;

		if( parentValidate ) {
			type = parentValidate.getChildType();
		}
		else {
			type = validator.introspectionStrategy.findType();
		}
		propName = processedModelExpression.propNameGetter($scope);
		childType = validator.introspectionStrategy.findType(null, controller.getType(), propName);
	}

	/**
	 * @ngdoc method
	 * @name egkyron.ValidateController#watchValidity
	 *
	 * @description
	 * Watch the validity of this model.
	 *
	 * Watches can be expensive, so it is made optional. A watch on the validity is
	 * required if the validity this field depends on others.
	 */
	function watchValidity() {
		if( !unwatch ) {
			unwatch = $scope.$watch(
				function() {
					var results = evaluateConstraints(ngModel.$modelValue, true);
					return isValid(results);
				},
				function(newval, oldval) {
					if( newval !== oldval ) {
						ngModel.$validate();
					}
				}
			);
		}
	}

	/**
	 * @ngdoc method
	 * @name egkyron.ValidateController#unwatchValidity
	 *
	 * @description
	 * Stop watch the validity of this model.
	 */
	function unwatchValidity() {
		if( angular.isFunction(unwatch) ) {
			unwatch();
			unwatch = null;
		}
	}

	function validate(modelValue, viewValue) {
		var x, r, validity, results = evaluateConstraints(modelValue || viewValue, false);

		if( !results || !results._validity ) {
			validity = EMPTY_OBJECT;
		}
		else {
			validity = results._validity;
		}

		for( x in validity ) {
			if( !validity.hasOwnProperty(x) ) continue;
			r = validity[x];
			ngModel.$setValidity(x, r.isValid);
			controller.handleMessage(x, r);
		}

		return isValid(results);
	}

	function evaluateConstraints(value, eager) {
		var
			validationContext = new ValidationContext(),
			validationArgs;

		validationArgs = validator.introspectionStrategy.prepareValidationFromScope($scope, processedModelExpression, controller.getType());
		validator.evaluateConstraints(validationContext, validationArgs.constraints, validationArgs.ctxObject, value, eager);

		return validationContext.result;
	}

	/**
	 * @ngdoc method
	 * @name egkyron.ValidateController#handleMessage
	 *
	 * @description
	 * Implement this method to handle validation messages.
	 *
	 * @param {string} validatorKey - The validator key (e.g. <code>required</code> or <code>regExp</code>)
	 * @param {ValidationResult} validationResult - The validation result
	 */
	function handleMessage(validatorKey, validationResult) {
		// jshint unused: false
		// INTENTIONALLY BLANK
	}

	/**
	 * @ngdoc method
	 * @name egkyron.ValidateController#getType
	 *
	 * @description
	 * Get the type of the object that contains the property being edited by this control.
	 * This method can be overriden by directives so as to define another type for the object containing
	 * this property; a use case would be:<br/>
	 *
	 * ```
	 *   <form validator="RootObjectValidator">
	 *     <input validate ng-model="root.name" /><!-- a property of the Root type -->
	 *     <input validate ng-model="root.address.street" validate-type="Address" /><!-- a property of the Address type -->
	 *   </form>
	 * ```
	 *
	 * @returns {string} - The type as string, or any other object as defined by the introspector
	 */
	function getType() {
		return type;
	}

	/**
	 * @ngdoc method
	 * @name egkyron.ValidateController#getChildType
	 *
	 * @description
	 * Get the type of the the property being edited by this control, to be used by nested validation
	 * directives to determine the type of their object.
	 *
	 * @returns {string} - The child type as string, or any other object as defined by the introspector
	 */
	function getChildType() {
		return childType;
	}

	/**
	 * @ngdoc method
	 * @name egkyron.ValidateController#skipIndex
	 *
	 * @description
	 * Instruct {@link validation.ValidateController#getChildType() `getChildType()`} to return the type of the array elements,
	 * if the type of the property being edited is array.
	 */
	function skipIndex() {
		if( childType && childType.indexOf('[]') === childType.length-2 ) {
			childType = childType.substring(0, childType.length-2);
		}
	}

	function isValid(results) {
		return results == null || (results._thisValid && (angular.isUndefined(results._childrenValid) || results._childrenValid === true));
	}

	angular.extend(this, {
		configure: configure,
		watchValidity: watchValidity,
		unwatchValidity: unwatchValidity,
		handleMessage: handleMessage,
		getType: getType,
		getChildType: getChildType,
		skipIndex: skipIndex
	});
}]);

angular.module('egkyron').factory('ValidationContext', ['ValidationResult', function(ValidationResult) {

/* exported ValidationContext */
/* global ValidationResult */
/**
 * The validation context carries information about the current validation, as well
 * as the validation result. It is meant to be used for a single validation.
 *
 * @constructor
 */
function ValidationContext() {
	/**
	 * The name of the constraint being validated, it may be useful for debugging and for the validator.
	 * @member {string}
	 */
	this.constraintName = null;
	/**
	 * A map from the model path to the results of validation for that path.
	 * It contains all paths that have been validated.
	 * <p>
	 * The <code>_validity</code> properties map the constraint key to the actual {@linkcode ValidationResult}.
	 * </p>
	 *
	 * @example
	 * // for a model such as the following:
	 * model = {
	 * 	name: "Nikos",
	 * 	address: {
	 * 		street: "Alpha",
	 * 		number: 3
	 * 	},
	 * 	pets: [
	 * 		{
	 * 			name: 'Sylvester'
	 * 		}
	 * 	]
	 * };
	 * 
	 * // the result would look like:
	 * result = {
	 * 	_thisValid: true,
	 * 	_childrenValid: false,
	 * 	_validity: {
	 * 		...
	 * 	},
	 * 	_children: {
	 * 		name: {
	 * 			_thisValid: true,
	 * 			// NOTE: no _childrenValid member
	 * 			_validity: {
	 * 				length: {...},    // a specific validator, e.g. for the string length
	 * 				nospaces: {...}   // another spacific validator, e.g. "contains no spaces"
	 * 			},
	 * 			_children: null
	 * 		},
	 * 		address: {
	 * 			_thisValid: true,
	 * 			_childrenValid: false,
	 * 			_validity: {
	 * 				...
	 * 			},
	 * 			_children: { // NOTE: children is object
	 * 				street: {
	 * 					_thisValid: true,
	 * 					_validity: {
	 * 						...
	 * 					},
	 * 					_children: null
	 * 				},
	 * 				number: {
	 * 					_thisValid: true,
	 * 					_validity: {
	 * 						...
	 * 					},
	 * 					_children: null
	 * 				}
	 * 			}
	 * 		},
	 * 		pets: {
	 * 			_validity: {
	 * 				...
	 * 			},
	 * 			_children: [ // NOTE: children is array
	 * 				{ // index/key is 0 implicitly
	 * 					name: {
	 * 						...
	 * 					}
	 * 				}
	 * 			]
	 * 		}
	 * 	}
	 * };
	 *
	 * @member {Object}
	 */
	this.result = { _thisValid: true, _validity: null, _children: null };
	/**
	 * The message related to the current result, usually a string but may be anything that makes sense to the underlying message display mechanism.
	 * @member {string|any}
	 */
	this.message = null;
	/**
	 * Message parameters related to the current result.
	 * @member {object}
	 */
	this.messageParams = null;
	/**
	 * Keep the path to the current property, so as to be able to return to the parent when <code>popPath()</code> is called.
	 * @member {Object[]}
	 */
	this.path = [this.result];
}

/**
 * Set the name of the constraint being validated and reset the <code>message</code> and <code>messageParams</code>.
 *
 * @param {string} constraintName - The name of the constraint being validated.
 */
ValidationContext.prototype.setCurrentConstraintName = function(constraintName) {
	this.constraintName = constraintName;
	this.message = null;
	this.messageParams = null;
};

/**
 * Set the outcome of the validator of the current constraint as a {@link ValidationResult}.
 *
 * @param {boolean} validityFlag - Whether the constraint with the current <code>constraintName</code> is fullfilled (i.e. <code>true</code> means valid).
 */
ValidationContext.prototype.addResult = function(validityFlag) {
	var i, curPath, result;
	curPath = this.path[this.path.length-1];
	result = new ValidationResult(validityFlag, this.message, this.messageParams);
	if( !curPath._validity ) {
		curPath._validity = {};
	}
	curPath._validity[this.constraintName] = result;
	if( !validityFlag ) {
		curPath._thisValid = false;
		for( i=this.path.length-2; i >= 0; i-- ) {
			this.path[i]._childrenValid = false;
		}
	}
};

/**
 * Set the message related to the current result.
 *
 * @param {string} msg - The message.
 */
ValidationContext.prototype.setMessage = function(msg) {
	this.message = msg;
};

/**
 * Set the parameters for the current message.
 *
 * @param {object} params - The message parameters.
 */
ValidationContext.prototype.setMessageParams = function(params) {
	this.messageParams = params;
};

/**
 * Called when entering a property of an object to mark the path.
 *
 * @param {string} path - Name of the property just entered.
 */
ValidationContext.prototype.pushPath = function(path) {
	var curPath = this.path[this.path.length-1], newPath = { _thisValid: true, _validity: null, _children: null };
	if( !curPath._children ) {
		curPath._children = (typeof(path) === 'number' ? [] : {});
	}
	if( typeof(curPath._childrenValid) === 'undefined' ) {
		curPath._childrenValid = true;
	}
	curPath._children[path] = newPath;
	this.path.push(newPath);
};

/**
 * Called when the validation is finished for the current property and its children.
 */
ValidationContext.prototype.popPath = function() {
	this.path.pop();
};

/**
 *
 */
return ValidationContext;
}]);

angular.module('egkyron').factory('ValidationResult', [function() {

/* exported ValidationResult */
/**
 * Validation result about a single constraint on a single field.
 *
 * @constructor
 *
 * @param {boolean} isValid - The validity flag.
 * @param {string|any} message - The message related to this result, usually a string but may be anything that makes sense to the underlying message display mechanism.
 * @param {object} [params] - Any params to format the message.
 */
function ValidationResult(isValid, message, params) {
	/**
	 * The validity flag.
	 * @member {boolean}
	 */
	this.isValid = !!isValid;
	/**
	 * The message related to this result, usually a string but may be anything that makes sense to the underlying message display mechanism.
	 * @member {string|any}
	 */
	this.message = message;
	/**
	 * Any params to format the message.
	 * @member {object}
	 */
	this.params = params;
}

/**
 *
 */
return ValidationResult;
}]);

angular.module('egkyron').factory('Validator', ['Constraint', 'ValidationContext', function(Constraint, ValidationContext) {

/* exported Validator */
/* global Constraint */
/* global ValidationContext */
/**
 * The core object for validation.
 *
 * @constructor
 *
 * @param {ValidatorRegistry} validatorRegistry - The validator registry.
 * @param {IntrospectionStrategy} IntrospectionStrategy - The constraints strategy.
 */
function Validator(validatorRegistry, introspectionStrategy) {
	/**
	 * The validator registry.
	 * @member {ValidatorRegistry}
	 */
	this.validatorRegistry = validatorRegistry;
	/**
	 * The introspection strategy.
	 * @member {IntrospectionStrategy}
	 */
	this.introspectionStrategy = introspectionStrategy;
}

/**
 * The default validation groups.
 * @static
 */
Validator.DEFAULT_GROUPS = ['default'];

/**
 * Validate a model, optionally running only the specified groups.
 * <p>
 * This is the main entry point for the model validation.
 * </p>
 *
 * @param {any} model - The model to validate.
 * @param {boolean} [eager] - If <code>true</code>, validation will stop at the first invalid field.
 * @param {string[]} [groups] - The groups to validate.
 * @returns {ValidationContext}
 */
Validator.prototype.validate = function(model, eager, groups) {
	var props, vctx = new ValidationContext(), nparams = 3, calculatedEager = eager, calculatedGroups = groups;
	if( model != null ) {
		if( Array.isArray(calculatedEager) ) {
			calculatedGroups = calculatedEager;
			calculatedEager = false;
			nparams -= 1;
		}
		if( !Array.isArray(calculatedGroups) ) {
			calculatedGroups = null;
			nparams -= 1;
		}
		if( typeof(calculatedEager) !== "boolean" ) {
			calculatedEager = false;
			nparams -= 1;
		}
		props = arguments.length > nparams ? Array.prototype.slice.call(arguments, nparams) : null;
		this.validateProperties(vctx, model, this.introspectionStrategy.findType(vctx, null, null), calculatedEager, calculatedGroups, props);
	}
	return vctx;
};

/**
 * Recursively validate the properties of the <code>model</code> object, optionally running only the specified groups
 * and limiting validation to the given properties.
 *
 * @protected
 * @param {ValidationContext} vctx - The validation context.
 * @param {any} model - The object whose properties will be validated.
 * @param {string} type - The type key of the value being validated.
 * @param {boolean} [eager] - If <code>true</code>, validation will stop at the first invalid field.
 * @param {string[]} [groups] - The groups to validate.
 * @param {string[]} [props] - The properties of <code>model</code> to validate.
 * @returns {boolean} - If validation should go on.
 */
Validator.prototype.validateProperties = function(vctx, model, type, eager, groups, props) {
	var self = this;
	props = sanitizeProps(props);
	return this.introspectionStrategy.enumerateProps(vctx, model, type, function(propName) {
		var ret, constraints, propValue;
		if( props == null || props.indexOf(propName) >= 0 ) {
			constraints = self.introspectionStrategy.extractConstraintsFromContext(vctx, model, type, propName);
			propValue = self.introspectionStrategy.evaluate(model, propName, type, vctx);
			vctx.pushPath(propName);
			self.evaluateConstraints(vctx, constraints, model, propValue, eager, groups);
			if( (!eager || !vctx.hasValidationErrors()) && (propValue != null && typeof(propValue) === 'object') ) {
				if( !(propValue instanceof Date) && (typeof(self.introspectionStrategy.shouldDescend) !== 'function' || self.introspectionStrategy.shouldDescend(model, propName, type, vctx)) ) {
					ret = self.validateProperties(vctx, propValue, self.introspectionStrategy.findType(vctx, type, propName), eager, groups);
					if( ret === false ) {
						return false;
					}
				}
			}
			vctx.popPath();
			if( eager && vctx.hasValidationErrors() ) {
				return false;
			}
		}
	});
};

/**
 * Sanitize the <code>propes</code> argument of {@linkcode validateProperties}, to be either an array,
 * if the original is non-<code>null</code>, or <code>null</code> otherwise, to signal that the <code>props</code>
 * argument should be disregarded and all properties must be validated.
 *
 * @memberof Validator
 * @private
 * @param {string[]} props - The original <code>props</code>.
 * @returns {string[]} - The sanitized <code>props</code>.
 */
function sanitizeProps(props) {
	if( props == null ) {
		return null;
	}
	var i, ret = [];
	for( i=0; i < props.length; i++ ) {
		if( props[i] != null ) ret.push(props[i]);
	}
	return ret.length > 0 ? ret : null;
}

/**
 * Validate a value given the constraints, optionally running only the specified groups.
 * Reports the validation result in the given validation context.
 * <p>
 * This is a secondary entry point to the validation process, used to validate a single field (e.g. from the UI).
 * </p>
 *
 * @param {ValidationContext} vctx - The validation context.
 * @param {Constraint[]} constraints - The constraints; may be <code>Constraint</code> objects or expressed in a shorthand form, e.g. a single <code>string</code> would indicate that the <code>Constraint.validator</code> should be read from an external mapping.
 * @param {Object} ctxObject - The object that contains the value being validated, will be used as <code>this</code> in the validator functions. May be <code>null</code>, if the validators do not use it.
 * @param {any} value - The value being validated.
 * @param {boolean} [eager] - If <code>true</code>, validation will stop at the first failed contstraint.
 * @param {string[]} [groups] - The groups to validate.
 */
Validator.prototype.evaluateConstraints = function(vctx, constraints, ctxObject, value, eager, groups) {
	var i, res, constraint;
	if( constraints ) {
		if( groups == null ) groups = Validator.DEFAULT_GROUPS;
		constraints = this.normalizeConstraints(constraints);
		for (i = 0; i < constraints.length; i++) {
			constraint = constraints[i];
			if( typeof(constraint.params.condition) === 'function' ) {
				res = constraint.params.condition.call(ctxObject, value, constraint.params, vctx);
				if( res === false ) {
					continue;
				}
			}
			if( inGroups(constraint, groups) ) {
				vctx.setCurrentConstraintName(constraint.key);
				res = constraint.validator.call(ctxObject, value, constraint.params, vctx);
				if( typeof(res) === "boolean" ) {
					vctx.addResult(res);
				}
				vctx.setCurrentConstraintName(null);
				if( eager && res === false ) {
					break;
				}
			}
		}
	}
};

/**
 * Normalize an array of constraints and cache the result.
 *
 * @protected
 *
 * @param {any[]} constraints - The array of constraints.
 * @returns {Constraint[]}
 */
Validator.prototype.normalizeConstraints = function(constraints) {
	var i;
	// TODO Let the introspector decide how to cache the normalized constraints
	// TODO Let the constraints be real Constraint objects
	if( !constraints._normalized ) {
		constraints._normalized = [];
		for( i=0; i < constraints.length; i++ ) {
			constraints._normalized.push(this.normalizeConstraint(constraints[i]));
		}
	}
	return constraints._normalized;
};

/**
 * Normalize a constraint, possibly expressed in a shorthand form, to a
 * proper <code>Constraint</code> object. This logic can be extended or
 * overriden by implementations. The current implementation allows for
 * the following shorthands:
 *
 * <dl>
 *   <dt><code>string</code></dt>
 *   <dd>This string is the key of the constraint; the validation function is read from an external mapping.</dd>
 *   <dt><code>Array</code></dt>
 *   <dd>Contains the following values, with only the key being mandatory:
 *     <ol>
 *       <li>The key of the constraint</li>
 *       <li>The validator function, or the key to the validator function (if it needs to be different than the constraint key for any reason)</li>
 *       <li>The parameters to the validation function, including the groups.</li>
 *     </ol>
 *   </dd>
 * </dl>
 *
 * @protected
 *
 * @param {any} constraint - A constraint object, possibly in shorthand form.
 * @returns {Constraint}
 */
Validator.prototype.normalizeConstraint = function(constraint) {
	// TODO Let the constraints be real Constraint objects
	var validatorKey;
	// Allow shorthand validator definition, e.g. (note, no nested array):
	//   MyClass.myFieldValidators = [  "futureDate"  ];
	// instead of:
	//   MyClass.myFieldValidators = [ ["futureDate","futureDate"] ];
	if( typeof(constraint) === "string" ) {
		constraint = [constraint, constraint];
	}
	// Allow shorthand:
	//   MyClass.myFieldValidators = [ ["length", {max: 9}] ];
	// instead of:
	//   MyClass.myFieldValidators = [ ["length", "length", {max: 9}] ];
	if( typeof(constraint[1]) === "object" && constraint[2] == null ) {
		constraint[2] = constraint[1];
		constraint[1] = constraint[0];
	}
	// If a name is defined use the registeredValidators to pick the validation function
	if( typeof(constraint[1]) === "string" ) {
		validatorKey = constraint[1];
		constraint[1] = this.validatorRegistry.getRegisteredValidator(validatorKey);
		if( !constraint[1] ) {
			throw new Error('no validator registered as ' + validatorKey);
		}
	}
	// ensure there is a `groups` property and allow for the shorthand (note no array):
	//   { groups: 'MYGORUP' }
	// instead of:
	//   { groups: ['MYGORUP'] }
	if( constraint[2] == null ) {
		constraint[2] = {};
	}
	if( constraint[2].groups == null ) {
		constraint[2].groups = Validator.DEFAULT_GROUPS.slice();
	}
	if( typeof(constraint[2].groups) === "string" ) {
		constraint[2].groups = [constraint[2].groups];
	}
	
	return new Constraint(constraint[0], constraint[1], constraint[2]);
};

/**
 * Determine if the <code>specGroups</code> contain any of the <code>requiredGroups</code>.
 *
 * @memberof Validator
 * @private
 * @param {Constraint} constraint - The constraint that defines the groups it applies to. It is expected to be normalized, so that <code>constraint.params.groups</code> will be an array.
 * @param {string[]} requiredGroups - The required groups for this constraint to be active.
 * @returns {boolean} - If at least one of the required groups is declared in the <code>specGroups</code>.
 */
function inGroups(constraint, requiredGroups) {
	var i, specGroups = constraint.params.groups;
	for( i=0; i < specGroups.length; i++ ) {
		if( requiredGroups.indexOf(specGroups[i]) >= 0 ) return true;
	}
	return false;
}



/**
 * A registry for {@linkplain Constraint~validator validator functions}.
 *
 * @name ValidatorRegistry
 * @class
 */
/**
 * Get a registered validator.
 *
 * @method getRegisteredValidator
 *
 * @memberof ValidatorRegistry.prototype
 * @param {string} name - The name (key) of the validator.
 * @returns {Constraint~validator}
 */
/**
 * Register a validator.
 *
 * @method registerValidator
 *
 * @memberof ValidatorRegistry.prototype
 * @param {string} name - The name (key) of the validator.
 * @param {Constraint~validator} validator - The validator.
 */



/**
 * A strategy for extracting validation information and introspecting the model.
 *
 * @name IntrospectionStrategy
 * @class
 */
/**
 * Extract the validity constraints for a property, given the model and, optionally, its type.
 *
 * @method extractConstraintsFromContext
 *
 * @memberof IntrospectionStrategy.prototype
 * @param {ValidationContext} vctx - The validation context.
 * @param {*} model - The model object to validate.
 * @param {string} type - Type of the object (an optional key for the validation constraints set)
 * @param {string} propertyName - Name of the property to validate.
 * @returns {Constraint[]|any[]} - Array of constraints in a format suitable to be passed to {@link Validator#evaluateConstraints}
 */
/**
 * Enumerate the properties of a model.
 *
 * @method enumerateProps
 *
 * @memberof IntrospectionStrategy.prototype
 * @param {ValidationContext} vctx - The validation context.
 * @param {*} model - The model object to validate.
 * @param {string} type - Type of the object (an optional key for the validation constraints set).
 * @param {IntrospectionStrategy~enumeratePropsCallback} callback - The function to call for each property of the <code>model</code>.
 */
/**
 * Evaluate the named property of a model.
 *
 * @method evaluate
 *
 * @memberof IntrospectionStrategy.prototype
 * @param {*} model - The model object to validate.
 * @param {string} propName - The name of the property to evaluate.
 * @param {string} type - Type of the object (an optional key for the validation constraints set).
 * @param {ValidationContext} vctx - The validation context.
 * @returns {*} - The value of the property.
 */
/**
 * Determine the type of the given property of the given parent type.
 *
 * @method findType
 *
 * @memberof IntrospectionStrategy.prototype
 * @param {ValidationContext} vctx - The validation context.
 * @param {string} parentType - Type of the object that contains the property, whose type is requested (an optional key for the validation constraints set).
 * @param {string} propName - The name of the property to evaluate.
 * @returns {string} - The type of the property.
 */
/**
 * Optional member to decide if the validation algorithm should descend into the given property.
 *
 * @method shouldDescend
 *
 * @memberof IntrospectionStrategy.prototype
 * @param {*} model - The model object.
 * @param {string} propName - The name of the property to decide.
 * @param {string} type - Type of the object (an optional key for the validation constraints set).
 * @param {ValidationContext} vctx - The validation context.
 * @returns {boolean} - Whether the validation algorithm should descend into the given property.
 */

/**
 * A callback invoked with the nect property name from the <code>IntrospectionStrategy</code>,
 * may return <code>false</code> to stop the iteration recursively.
 *
 * @callback IntrospectionStrategy~enumeratePropsCallback
 * @param {string|number} propName - The name of the property or index in the current array.
 * @returns {boolean|void} - If a literal <code>false</code> is returned, the validation will exit (used to implement the <code>eager</code> flag).
 */


/**
 *
 */
return Validator;
}]);

/**
 * @ngdoc directive
 * @name egkyron.directive:validator
 * @function
 *
 * @description
 * Specify the validator to be used for all the child elements.
 *
 */
angular.module('egkyron').directive('validator', function() {
	return {
		restrict: 'A',
		scope: false,
		controller: ['$scope', '$parse', '$attrs', function($scope, $parse, $attrs) {
			var validator = $parse($attrs.validator)($scope);

			this.getValidator = function() {
				return validator;
			};
		}]
	};
});
