#include "lexer.h"
#include <cctype>
#include <unordered_set>

namespace ApiAnalyzer {

static const std::unordered_set<std::string> CPP_KEYWORDS = {
    "class", "struct", "public", "private", "protected",
    "void", "int", "bool", "float", "double", "auto",
    "return", "try", "catch", "throw", "const", "static",
    "virtual", "override", "namespace", "using", "new", "delete"
};

Lexer::Lexer(const std::string& sourceCode)
    : source_(sourceCode), cursor_(0), currentLine_(1), currentColumn_(1) {}

char Lexer::peek(size_t offset) const {
    if (cursor_ + offset >= source_.size()) return '\0';
    return source_[cursor_ + offset];
}

char Lexer::advance() {
    if (isAtEnd()) return '\0';
    char c = source_[cursor_++];
    if (c == '\n') {
        currentLine_++;
        currentColumn_ = 1;
    } else {
        currentColumn_++;
    }
    return c;
}

bool Lexer::isAtEnd() const {
    return cursor_ >= source_.size();
}

void Lexer::skipWhitespaceAndComments() {
    while (!isAtEnd()) {
        char c = peek();
        if (c == ' ' || c == '\t' || c == '\r' || c == '\n') {
            advance();
        } else if (c == '/' && peek(1) == '/') {
            // Line comment
            advance(); advance();
            while (!isAtEnd() && peek() != '\n') {
                advance();
            }
        } else if (c == '/' && peek(1) == '*') {
            // Block comment
            advance(); advance();
            while (!isAtEnd()) {
                if (peek() == '*' && peek(1) == '/') {
                    advance(); advance();
                    break;
                }
                advance();
            }
        } else {
            break;
        }
    }
}

Token Lexer::readAnnotation() {
    int startLine = currentLine_;
    int startCol = currentColumn_;
    advance(); // Skip '@'

    std::string text = "@";
    while (!isAtEnd() && (std::isalnum(static_cast<unsigned char>(peek())) || peek() == '_')) {
        text.push_back(advance());
    }

    return Token{TokenType::ANNOTATION, text, startLine, startCol};
}

Token Lexer::readIdentifierOrKeyword() {
    int startLine = currentLine_;
    int startCol = currentColumn_;

    std::string text;
    while (!isAtEnd()) {
        char c = peek();
        if (std::isalnum(static_cast<unsigned char>(c)) || c == '_' || c == ':') {
            text.push_back(advance());
        } else {
            break;
        }
    }

    TokenType type = TokenType::IDENTIFIER;
    if (CPP_KEYWORDS.find(text) != CPP_KEYWORDS.end()) {
        type = TokenType::KEYWORD;
    }

    return Token{type, text, startLine, startCol};
}

Token Lexer::readString() {
    int startLine = currentLine_;
    int startCol = currentColumn_;
    advance(); // Skip leading '"'

    std::string text;
    while (!isAtEnd() && peek() != '"') {
        char c = advance();
        if (c == '\\' && !isAtEnd()) {
            char escaped = advance();
            if (escaped == 'n') text.push_back('\n');
            else if (escaped == 't') text.push_back('\t');
            else if (escaped == '"') text.push_back('"');
            else if (escaped == '\\') text.push_back('\\');
            else text.push_back(escaped);
        } else {
            text.push_back(c);
        }
    }

    if (!isAtEnd() && peek() == '"') {
        advance(); // Skip closing '"'
    }

    return Token{TokenType::STRING_LITERAL, text, startLine, startCol};
}

Token Lexer::readNumber() {
    int startLine = currentLine_;
    int startCol = currentColumn_;

    std::string text;
    while (!isAtEnd() && (std::isdigit(static_cast<unsigned char>(peek())) || peek() == '.')) {
        text.push_back(advance());
    }

    return Token{TokenType::NUMBER, text, startLine, startCol};
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;

    while (!isAtEnd()) {
        skipWhitespaceAndComments();
        if (isAtEnd()) break;

        char c = peek();
        int line = currentLine_;
        int col = currentColumn_;

        if (c == '@') {
            tokens.push_back(readAnnotation());
        } else if (std::isalpha(static_cast<unsigned char>(c)) || c == '_') {
            tokens.push_back(readIdentifierOrKeyword());
        } else if (std::isdigit(static_cast<unsigned char>(c))) {
            tokens.push_back(readNumber());
        } else if (c == '"') {
            tokens.push_back(readString());
        } else if (c == '(') {
            advance();
            tokens.push_back(Token{TokenType::LPAREN, "(", line, col});
        } else if (c == ')') {
            advance();
            tokens.push_back(Token{TokenType::RPAREN, ")", line, col});
        } else if (c == '{') {
            advance();
            tokens.push_back(Token{TokenType::LBRACE, "{", line, col});
        } else if (c == '}') {
            advance();
            tokens.push_back(Token{TokenType::RBRACE, "}", line, col});
        } else if (c == '<') {
            advance();
            tokens.push_back(Token{TokenType::LANGLE, "<", line, col});
        } else if (c == '>') {
            advance();
            tokens.push_back(Token{TokenType::RANGLE, ">", line, col});
        } else if (c == ';') {
            advance();
            tokens.push_back(Token{TokenType::SEMICOLON, ";", line, col});
        } else if (c == ',') {
            advance();
            tokens.push_back(Token{TokenType::COMMA, ",", line, col});
        } else if (c == ':') {
            advance();
            tokens.push_back(Token{TokenType::COLON, ":", line, col});
        } else if (c == '-' && peek(1) == '>') {
            advance(); advance();
            tokens.push_back(Token{TokenType::ARROW, "->", line, col});
        } else {
            std::string op(1, advance());
            tokens.push_back(Token{TokenType::OPERATOR_SYMBOL, op, line, col});
        }
    }

    tokens.push_back(Token{TokenType::END_OF_FILE, "", currentLine_, currentColumn_});
    return tokens;
}

} // namespace ApiAnalyzer
