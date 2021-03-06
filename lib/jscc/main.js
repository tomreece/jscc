/*
 * Universal module definition for main entry point of JS/CC.
 */
(function(root, factory) {
    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define(['require', './global', './io/io', './first',
                './printtab', './tabgen', './util',
                './integrity', './lexdbg',
                './parse', './log/log', './enums/LOG_LEVEL', './enums/EXEC', './lexdfa',
                './enums/MODE_GEN'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require);
    } else {
        root.jscc = factory(function(mod) {
            return root["jscc" + mod.split("/").pop()];
        });
    }
}(this,
  /**
   * @param {reqParameter} require
   * @param {...*} others
   * @returns {function(?mainOptions=)}
   */
  function(require, others) {
    var io, log, global = /** @type {jscc.global} */ (require("./global")),
        first = /** @type {jscc.first} */ (require("./first")),
        printtab = /** @type {jscc.printtab} */ (require("./printtab")),
        tabgen = /** @type {jscc.tabgen} */ (require("./tabgen")),
        util = /** @type {jscc.util} */ (require("./util")),
        integrity = /** @type {jscc.integrity} */ (require("./integrity")),
        lexdbg = /** @type {jscc.lexdbg} */ (require("./lexdbg")),
        parse = /** @type {function(string, string=):number} */ (require("./parse")),
        LOG_LEVEL = require("./enums/LOG_LEVEL"),
        EXEC = require("./enums/EXEC"),
        lexdfa = /** @type {jscc.lexdfa} */ (require("./lexdfa")),
        MODE_GEN = require("./enums/MODE_GEN");

      //>>excludeStart("closure", pragmas.closure);
      var has = /** @type {hasObject} */ (require("./localHas"));
      //>>excludeEnd("closure");
      /**
       * @suppress {uselessCode}
       */
      (function() {
          if (has("node")) {
              io = /** @type {jscc.io} */ (require("./io/ioNode"));
              log = /** @type {jscc.log} */ (require("./log/logNode"));
          } else {
              io = /** @type {jscc.io} */ (require("./io/io"));
              log = /** @type {jscc.log} */ (require("./log/log"));
          }
      })();
    
    /**
     * The main entry point of JS/CC.  Call this module as a function to
     * process a grammar specification.
     * @module jscc
     * @requires module:jscc/global
     * @requires module:jscc/io/io
     * @requires module:jscc/first
     * @requires module:jscc/printtab
     * @requires module:jscc/tabgen
     * @requires module:jscc/util
     * @requires module:jscc/integrity
     * @requires module:jscc/lexdbg
     * @requires module:jscc/parse
     * @requires module:jscc/log/log
     * @param {?mainOptions=} options - Configuration options for the jscc module.
     */
    var main =
        function(options) {
            var opt = options || {};
            var logLevel = /** jscc.enums.LOG_LEVEL */ (LOG_LEVEL.WARN);
            if (typeof opt['logLevel'] === 'string') {
                logLevel = util.log_level_value(opt['logLevel']);
            } else if (opt['logLevel']) {
                logLevel = /** jscc.enums.LOG_LEVEL */ (opt['logLevel']);
            }
            log.setLevel(logLevel);
            log.trace("jscc main: processing options");
            var out_file = (typeof opt['out_file'] === 'string') ? opt['out_file'] : "";
            var src_file = (typeof opt['src_file'] === 'string') ? opt['src_file'] : "";
            var tpl_file = (typeof opt['tpl_file'] === 'string') ? opt['tpl_file'] : "";
            var dump_nfa = (typeof opt['dump_nfa'] === 'boolean') ? opt['dump_nfa'] : false;
            var dump_dfa = (typeof opt['dump_dfa'] === 'boolean') ? opt['dump_dfa'] : false;
            var verbose = (typeof opt['verbose'] === 'boolean') ? opt['verbose'] : false;
            var inputString = /** @type {string} */ ((typeof opt['input'] === 'string') ? opt['input'] : "");
            var inputFunction = (typeof opt['input'] === 'function') ? opt['input'] : null;
            var templateString = (typeof opt['template'] === 'string') ? opt['template'] : global.DEFAULT_DRIVER;
            var templateFunction = (typeof opt['template'] === 'function') ? opt['template'] : null;
            var outputCallback = (typeof opt['outputCallback'] === 'function') ? opt['outputCallback'] : null;
            var throwIfErrors = (typeof opt['throwIfErrors'] === 'boolean') ? opt['throwIfErrors'] : false;
            var exitIfErrors = (typeof opt['exitIfErrors'] === 'boolean') ? opt['exitIfErrors'] : false;

            // Only relevant to browsers, but include anyway
            if (inputString !== "") {
                global.read_all_input_function = function() {
                    return inputString;
                }
            } else if (inputFunction) {
                global.read_all_input_function = inputFunction;
            }

            if (templateString !== "") {
                global.read_template_function = function() {
                    return templateString;
                }
            } else if (templateFunction) {
                global.read_template_function = templateFunction;
            }

            if (outputCallback) {
                global.write_output_function = outputCallback;
            }

            global.file = (src_file || "") === "" ? "[input]" : src_file;
            global.dump_nfa = dump_nfa;
            global.dump_dfa = dump_dfa;

            log.trace("jscc main: reading source");
            var src = inputString;
            if (src === "") {
                if (inputFunction) {
                    src = inputFunction();
                } else if (src_file !== "") {
                    src = /** @type {string} */ (io.read_all_input(src_file));
                } else {
                    // TODO: read standard input
                    log.error("No input.  Specify input or src_file in the options parameter.");
                }
            }
            if (src !== "") {
                log.trace("jscc main: parse");
                parse(src, global.file);

                if (global.errors == 0) {
                    log.trace("jscc main: integrity.undef()");
                    integrity.undef();
                    log.trace("jscc main: integrity.unreachable()");
                    integrity.unreachable();

                    if (global.errors == 0) {
                        log.trace("jscc main: first.first()");
                        first.first();
                        log.trace("jscc main: tabgen.lalr1_parse_table(false)");
                        tabgen.lalr1_parse_table(false);
                        log.trace("jscc main: integrity.check_empty_states()");
                        integrity.check_empty_states();

                        if (global.errors == 0) {
                            if (global.dump_dfa) {
                                lexdbg.print_dfa(global.dfa_states);
                            }
                            log.trace("jscc main: lexdfa.create_subset(global.nfa_states.value)");
                            global.dfa_states = lexdfa.create_subset(global.nfa_states.value);
                            log.trace("jscc main: lexdfa.minimize_dfa(global.dfa_states)");
                            global.dfa_states = lexdfa.minimize_dfa(global.dfa_states);
                            log.trace("jscc main: read template");
                            /**
                             * @type {string}
                             */
                            var driver = templateString;
                            if (templateFunction) {
                                driver = templateFunction();
                            } else if (tpl_file !== "") {
                                driver = /** @type {string} */ (io.read_template(tpl_file));
                            }

                            log.trace("jscc main: replace template strings");
                            driver = driver.replace(/##HEADER##/gi, global.code_head);
                            driver = driver.replace(/##TABLES##/gi, printtab.print_parse_tables(MODE_GEN.JS));
                            driver = driver.replace(/##DFA##/gi, printtab.print_dfa_table(global.dfa_states));
                            driver = driver.replace(/##TERMINAL_ACTIONS##/gi, printtab.print_term_actions());
                            driver = driver.replace(/##LABELS##/gi, printtab.print_symbol_labels());
                            driver = driver.replace(/##ACTIONS##/gi, printtab.print_actions());
                            driver = driver.replace(/##FOOTER##/gi, global.code_foot);
                            driver = driver.replace(/##ERROR_TOKEN##/gi, printtab.get_error_symbol_id().toString());
                            driver = driver.replace(/##EOF##/gi, printtab.get_eof_symbol_id().toString());
                            driver = /** @type {string} */
                                (driver.replace(/##WHITESPACE##/gi, printtab.get_whitespace_symbol_id().toString()));

                            log.trace("jscc main: output");
                            if (global.errors == 0) {
                                if (outputCallback) {
                                    outputCallback(driver);
                                } else if (out_file != "") {
                                    io.write_output({
                                                        text: driver,
                                                        destination: out_file
                                                    });
                                } else {
                                    io.write_output(driver);
                                }
                            }

                            if (verbose) {
                                log.info("\"" + src_file + "\" produced " + global.states.length + " states (" +
                                         global.shifts + " shifts," +
                                         global.reduces + " reductions, " + global.gotos + " gotos)");
                            }
                        }
                    }
                }

                if (verbose) {
                    log.info(global.warnings + " warning" + (global.warnings > 1 ? "s" : "") + ", " +
                             global.errors + " error" + (global.errors > 1 ? "s" : ""));
                }

            }

            if (exitIfErrors && global.errors > 0) {
                io.exit(1);
            }

            if (throwIfErrors && global.errors > 0) {
                throw new Error("There were one or more compilation errors.  See the log output for more information.");
            }
        };
    return main;
}));
