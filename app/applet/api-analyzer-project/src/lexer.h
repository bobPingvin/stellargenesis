#pragma once

#include <string>
#include <vector>

namespace ApiAnalyzer {

enum class TokenType {
    END_OF_FILE,
    IDENTIFIER,
    KEYWORD,
    ANNOTATION,      // @GetMapping, @Async, @Controller, etc.
    STRING_LITERAL,  // "/users"
    NUMBER,
    LPAREN,          // (
    RPAREN,          // )
    LBRACE,          // {
    RBRACE,          // }
    LANGLE,          // <
    RANGLE,          // >
    SEMICOLON,       // ;
    COMMA,           // ,
    COLON,           // :
    ARROW,           // ->
    OPERATOR_SYMBOL,
    UNKNOWN
};

struct Token {
    TokenType type{TokenType::UNKNOWN};
    std::string text;
    int line{1};
    int column{1};
};

class Lexer {
public:
    explicit Lexer(const std::string& sourceCode);
    std::vector<Token> tokenize();

private:
    char peek(size_t offset = 0) const;
    char advance();
    bool isAtEnd() const;

    void skipWhitespaceAndComments();
    Token readIdentifierOrKeyword();
    Token readAnnotation();
    Token readString();
    Token readNumber();

    std::string source_;
    size_t cursor_{0};
    int currentLine_{1};
    int currentColumn_{1};
};

} // namespace ApiAnalyzer
