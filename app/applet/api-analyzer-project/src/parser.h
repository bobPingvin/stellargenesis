#pragma once

#include "lexer.h"
#include "models.h"
#include <string>
#include <vector>

namespace ApiAnalyzer {

class Parser {
public:
    explicit Parser(std::vector<Token> tokens, const std::string& filePath = "");
    std::vector<Controller> parseControllers();

private:
    const Token& peek(size_t offset = 0) const;
    const Token& advance();
    bool match(TokenType type);
    bool check(TokenType type) const;
    bool isAtEnd() const;

    void parseControllerDeclaration(Controller& currentController);
    void parseMethod(Controller& currentController, 
                     const std::vector<Token>& pendingAnnotations);
    void parseParameters(ApiMethod& method);
    void analyzeMethodBody(ApiMethod& method);

    std::vector<Token> tokens_;
    std::string filePath_;
    size_t cursor_{0};
};

} // namespace ApiAnalyzer
