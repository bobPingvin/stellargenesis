#include "parser.h"
#include "logger.h"
#include <algorithm>

namespace ApiAnalyzer {

Parser::Parser(std::vector<Token> tokens, const std::string& filePath)
    : tokens_(std::move(tokens)), filePath_(filePath), cursor_(0) {}

const Token& Parser::peek(size_t offset) const {
    if (cursor_ + offset >= tokens_.size()) {
        return tokens_.back(); // END_OF_FILE
    }
    return tokens_[cursor_ + offset];
}

const Token& Parser::advance() {
    if (!isAtEnd()) cursor_++;
    return tokens_[cursor_ - 1];
}

bool Parser::match(TokenType type) {
    if (check(type)) {
        advance();
        return true;
    }
    return false;
}

bool Parser::check(TokenType type) const {
    if (isAtEnd()) return false;
    return peek().type == type;
}

bool Parser::isAtEnd() const {
    return cursor_ >= tokens_.size() || peek().type == TokenType::END_OF_FILE;
}

std::vector<Controller> Parser::parseControllers() {
    std::vector<Controller> controllers;
    std::vector<Token> pendingAnnotations;

    while (!isAtEnd()) {
        if (check(TokenType::ANNOTATION)) {
            pendingAnnotations.push_back(advance());
            // Check for annotation arguments like @GetMapping("/users") or @Middleware("Auth")
            if (check(TokenType::LPAREN)) {
                pendingAnnotations.push_back(advance()); // '('
                while (!isAtEnd() && !check(TokenType::RPAREN)) {
                    pendingAnnotations.push_back(advance());
                }
                if (check(TokenType::RPAREN)) {
                    pendingAnnotations.push_back(advance()); // ')'
                }
            }
            continue;
        }

        // Check if we hit class or struct
        if (check(TokenType::KEYWORD) && (peek().text == "class" || peek().text == "struct")) {
            advance(); // consume class/struct

            Controller controller;
            controller.filePath = filePath_;
            if (check(TokenType::IDENTIFIER)) {
                controller.name = advance().text;
            } else {
                controller.name = "AnonymousController";
            }

            // Extract annotations on the class
            for (size_t i = 0; i < pendingAnnotations.size(); ++i) {
                const auto& ann = pendingAnnotations[i];
                if (ann.text == "@Controller" || ann.text == "@RestController") {
                    // Check if path argument follows
                    if (i + 2 < pendingAnnotations.size() && 
                        pendingAnnotations[i+1].type == TokenType::LPAREN && 
                        pendingAnnotations[i+2].type == TokenType::STRING_LITERAL) {
                        controller.baseRoute = pendingAnnotations[i+2].text;
                    }
                } else if (ann.text == "@Middleware") {
                    if (i + 2 < pendingAnnotations.size() && 
                        pendingAnnotations[i+1].type == TokenType::LPAREN && 
                        pendingAnnotations[i+2].type == TokenType::STRING_LITERAL) {
                        controller.middlewares.push_back(pendingAnnotations[i+2].text);
                    }
                } else if (ann.text == "@Filter") {
                    if (i + 2 < pendingAnnotations.size() && 
                        pendingAnnotations[i+1].type == TokenType::LPAREN && 
                        pendingAnnotations[i+2].type == TokenType::STRING_LITERAL) {
                        controller.filters.push_back(pendingAnnotations[i+2].text);
                    }
                }
            }
            pendingAnnotations.clear();

            // Skip until '{'
            while (!isAtEnd() && !check(TokenType::LBRACE)) {
                advance();
            }

            if (check(TokenType::LBRACE)) {
                advance(); // '{'
                int braceDepth = 1;
                std::vector<Token> methodAnnotations;

                while (!isAtEnd() && braceDepth > 0) {
                    if (check(TokenType::LBRACE)) {
                        braceDepth++;
                        advance();
                    } else if (check(TokenType::RBRACE)) {
                        braceDepth--;
                        advance();
                        if (braceDepth == 0) break;
                    } else if (check(TokenType::ANNOTATION)) {
                        methodAnnotations.push_back(advance());
                        if (check(TokenType::LPAREN)) {
                            methodAnnotations.push_back(advance());
                            while (!isAtEnd() && !check(TokenType::RPAREN)) {
                                methodAnnotations.push_back(advance());
                            }
                            if (check(TokenType::RPAREN)) {
                                methodAnnotations.push_back(advance());
                            }
                        }
                    } else if (!methodAnnotations.empty() && check(TokenType::IDENTIFIER) || (check(TokenType::KEYWORD) && peek().text != "public" && peek().text != "private")) {
                        // Might be a method declaration!
                        parseMethod(controller, methodAnnotations);
                        methodAnnotations.clear();
                    } else {
                        advance();
                    }
                }
            }

            controllers.push_back(controller);
        } else {
            // Not a class, advance
            advance();
        }
    }

    return controllers;
}

void Parser::parseMethod(Controller& currentController, 
                         const std::vector<Token>& pendingAnnotations) {
    ApiMethod method;
    method.lineNumber = peek().line;

    // Process method annotations
    for (size_t i = 0; i < pendingAnnotations.size(); ++i) {
        const auto& ann = pendingAnnotations[i];
        if (ann.text == "@GetMapping") {
            method.httpMethod = HttpMethod::GET;
            if (i + 2 < pendingAnnotations.size() && pendingAnnotations[i+1].type == TokenType::LPAREN && pendingAnnotations[i+2].type == TokenType::STRING_LITERAL) {
                method.routePath = pendingAnnotations[i+2].text;
            }
        } else if (ann.text == "@PostMapping") {
            method.httpMethod = HttpMethod::POST;
            if (i + 2 < pendingAnnotations.size() && pendingAnnotations[i+1].type == TokenType::LPAREN && pendingAnnotations[i+2].type == TokenType::STRING_LITERAL) {
                method.routePath = pendingAnnotations[i+2].text;
            }
        } else if (ann.text == "@PutMapping") {
            method.httpMethod = HttpMethod::PUT;
            if (i + 2 < pendingAnnotations.size() && pendingAnnotations[i+1].type == TokenType::LPAREN && pendingAnnotations[i+2].type == TokenType::STRING_LITERAL) {
                method.routePath = pendingAnnotations[i+2].text;
            }
        } else if (ann.text == "@DeleteMapping") {
            method.httpMethod = HttpMethod::DELETE;
            if (i + 2 < pendingAnnotations.size() && pendingAnnotations[i+1].type == TokenType::LPAREN && pendingAnnotations[i+2].type == TokenType::STRING_LITERAL) {
                method.routePath = pendingAnnotations[i+2].text;
            }
        } else if (ann.text == "@PatchMapping") {
            method.httpMethod = HttpMethod::PATCH;
            if (i + 2 < pendingAnnotations.size() && pendingAnnotations[i+1].type == TokenType::LPAREN && pendingAnnotations[i+2].type == TokenType::STRING_LITERAL) {
                method.routePath = pendingAnnotations[i+2].text;
            }
        } else if (ann.text == "@Async") {
            method.isAsync = true;
        } else if (ann.text == "@Middleware") {
            if (i + 2 < pendingAnnotations.size() && pendingAnnotations[i+1].type == TokenType::LPAREN && pendingAnnotations[i+2].type == TokenType::STRING_LITERAL) {
                method.middlewares.push_back(pendingAnnotations[i+2].text);
            }
        } else if (ann.text == "@Filter") {
            if (i + 2 < pendingAnnotations.size() && pendingAnnotations[i+1].type == TokenType::LPAREN && pendingAnnotations[i+2].type == TokenType::STRING_LITERAL) {
                method.filters.push_back(pendingAnnotations[i+2].text);
            }
        }
    }

    // Combine baseRoute + routePath
    if (!currentController.baseRoute.empty()) {
        std::string base = currentController.baseRoute;
        if (base.back() == '/' && !method.routePath.empty() && method.routePath.front() == '/') {
            base.pop_back();
        }
        method.routePath = base + method.routePath;
    }
    if (method.routePath.empty()) {
        method.routePath = "/";
    }

    // Parse Return Type (e.g., List<User>, User, Product, void)
    std::string retType;
    while (!isAtEnd() && !check(TokenType::LPAREN)) {
        if (peek(1).type == TokenType::LPAREN) {
            // The token right before '(' is the method name!
            method.name = advance().text;
            break;
        }
        if (!retType.empty() && peek().type != TokenType::LANGLE && peek().type != TokenType::RANGLE) {
            retType += " ";
        }
        retType += advance().text;
    }

    if (retType.empty()) retType = "void";
    method.returnType = retType;

    // Parse parameters inside '(' ... ')'
    if (check(TokenType::LPAREN)) {
        advance(); // '('
        parseParameters(method);
    }

    // Parse Body inside '{' ... '}'
    while (!isAtEnd() && !check(TokenType::LBRACE) && !check(TokenType::SEMICOLON)) {
        advance();
    }

    if (check(TokenType::LBRACE)) {
        advance(); // '{'
        analyzeMethodBody(method);
    } else if (check(TokenType::SEMICOLON)) {
        advance(); // pure virtual / declaration
    }

    currentController.methods.push_back(method);
}

void Parser::parseParameters(ApiMethod& method) {
    std::vector<Token> paramTokens;

    while (!isAtEnd() && !check(TokenType::RPAREN)) {
        if (check(TokenType::COMMA)) {
            // Finish current parameter
            if (!paramTokens.empty()) {
                HttpParam param;
                if (paramTokens.size() == 1) {
                    param.name = paramTokens[0].text;
                    param.type = "var";
                } else {
                    param.name = paramTokens.back().text;
                    paramTokens.pop_back();
                    std::string typeStr;
                    for (const auto& t : paramTokens) {
                        typeStr += t.text;
                    }
                    param.type = typeStr;
                }
                method.parameters.push_back(param);
                paramTokens.clear();
            }
            advance(); // ','
            continue;
        }

        paramTokens.push_back(advance());
    }

    if (!paramTokens.empty()) {
        HttpParam param;
        if (paramTokens.size() == 1) {
            param.name = paramTokens[0].text;
            param.type = "var";
        } else {
            param.name = paramTokens.back().text;
            paramTokens.pop_back();
            std::string typeStr;
            for (const auto& t : paramTokens) {
                typeStr += t.text;
            }
            param.type = typeStr;
        }
        method.parameters.push_back(param);
    }

    if (check(TokenType::RPAREN)) {
        advance(); // ')'
    }
}

void Parser::analyzeMethodBody(ApiMethod& method) {
    int depth = 1;
    bool inTry = false;
    bool inCatch = false;

    while (!isAtEnd() && depth > 0) {
        if (check(TokenType::LBRACE)) {
            depth++;
            advance();
        } else if (check(TokenType::RBRACE)) {
            depth--;
            advance();
            if (depth == 0) break;
        } else {
            const Token& t = peek();
            std::string lowerText = t.text;
            std::transform(lowerText.begin(), lowerText.end(), lowerText.begin(), ::tolower);

            if (t.type == TokenType::KEYWORD && t.text == "try") {
                inTry = true;
            } else if (t.type == TokenType::KEYWORD && t.text == "catch") {
                inCatch = true;
                method.hasExceptionHandling = true;
            } else if (lowerText.find("cache") != std::string::npos) {
                method.hasCaching = true;
            } else if (lowerText.find("valid") != std::string::npos ||
                       lowerText.find("assert") != std::string::npos ||
                       lowerText == "req.validate" || lowerText == "validate") {
                method.hasValidation = true;
            }
            advance();
        }
    }
}

} // namespace ApiAnalyzer
