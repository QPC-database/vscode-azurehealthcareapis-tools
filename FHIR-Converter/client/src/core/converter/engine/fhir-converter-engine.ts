/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License in the project root for license information.
 */

import * as fs from 'fs';
import * as cp from 'child_process';
import * as path from 'path';
import localize from '../../../i18n/localize';
import { IConverterEngine } from './converter-engine';
import { ConversionError } from '../../common/errors/conversion-error';
import * as engineConstants from '../../common/constants/engine';
import * as stringUtils from '../../common/utils/string-utils';
import * as engineUtils from '../../common/utils/engine-utils';
import * as fileUtils from '../../common/utils/file-utils';

export class FhirConverterEngine implements IConverterEngine {
	private _exePath: string;
	private _templateFolder: string;
	private _rootTemplate: string;
	private _resultFolder: string;

	constructor(templateFolder: string, rootTemplate: string, resultFolder: string, exePath: string = engineConstants.DefaultHl7v2ExePath) {
		this._templateFolder = templateFolder;
		this._rootTemplate = rootTemplate;
		this._resultFolder = resultFolder;
		this._exePath = exePath;
	}

	process(dataFile: string) {
		// Check that data file is available 
		if (!dataFile) {
			throw new ConversionError(localize('message.needSelectData'));
		}

		// Check if data file exists
		if (!fs.existsSync(dataFile)) {
			throw new ConversionError(localize('message.dataFileNotExists', dataFile));
		}

		// Call the engine
		const timestamp = new Date().getTime().toString();
		const resultFile = path.join(this._resultFolder, stringUtils.getResultFileName(dataFile, this._rootTemplate, timestamp));
		const defaultResultFile = path.join(this._resultFolder, engineConstants.DefaultResultFile);
		const rootTemplate = stringUtils.getFileNameWithoutExt(this._rootTemplate);
		try {
			cp.execFileSync(this._exePath, ['convert', '-d', this._templateFolder, '-r',  rootTemplate, '-n', dataFile, '-f', defaultResultFile, '-t']);
		} catch (err) {
			throw new ConversionError(err.stderr.toString());
		}
		if (fs.existsSync(defaultResultFile)) {
			const resultMsg = JSON.parse(fs.readFileSync(defaultResultFile).toString());
			if (!engineUtils.checkConversionSuccess(resultMsg)) {
				throw new ConversionError(localize('message.noResponseFromEngine'));
			}
			fileUtils.writeJsonToFile(resultFile, resultMsg.FhirResource);
			return { resultFile: resultFile, traceInfo: resultMsg.TraceInfo };
		} else {
			throw new ConversionError(localize('message.noResponseFromEngine'));
		}
	}
}
