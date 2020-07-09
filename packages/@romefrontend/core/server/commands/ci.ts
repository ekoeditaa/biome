/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {DiagnosticsPrinter} from "@romefrontend/cli-diagnostics";
import {ServerRequest} from "@romefrontend/core";
import {commandCategories} from "../../common/commands";
import {createServerCommand} from "../commands";
import check from "./check";
import test from "./test";
import {Consumer} from "@romefrontend/consume";

async function runChildCommand(
	req: ServerRequest,
	fn: () => Promise<void>,
): Promise<void> {
	try {
		await fn();
	} catch (err) {
		if (err instanceof DiagnosticsPrinter) {
			// If the command raises diagnostics, it is safe to throw the printer.
			// By doing so, the `ci` command bails and is marked as failed.
			if (err.hasDiagnostics()) {
				throw err;
			} else {
				req.server.handleRequestError(req, err);
			}
		} else {
			throw err;
		}
	}
}

type Flags = {
	fix: boolean;
};

export default createServerCommand({
	category: commandCategories.CODE_QUALITY,
	description: "run lint and tests",
	usage: "",
	examples: [],
	defineFlags(consumer: Consumer): Flags {
		return {
			fix: consumer.get("fix").asBoolean(false),
		};
	},
	async callback(req: ServerRequest, flags: Flags): Promise<void> {
		const {reporter} = req;

		req.updateRequestFlags({
			verboseDiagnostics: true,
		});

		reporter.heading("Running lint");
		await runChildCommand(
			req,
			async () => {
				await check.callback(
					req,
					{
						formatOnly: false,
						decisions: [],
						apply: flags.fix,
						changed: undefined,
					},
				);
			},
		);

		reporter.heading("Running tests");
		await runChildCommand(
			req,
			async () => {
				await test.callback(
					req,
					{
						filter: undefined,
						focusAllowed: false,
						coverage: false,
						freezeSnapshots: !flags.fix,
						updateSnapshots: flags.fix,
						showAllCoverage: false,
						syncTests: false,
					},
				);
			},
		);
	},
});
