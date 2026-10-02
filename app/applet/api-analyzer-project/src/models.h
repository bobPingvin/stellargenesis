#pragma once

#include <string>
#include <vector>
#include <chrono>

namespace ApiAnalyzer {

enum class HttpMethod {
    GET,
    POST,
    PUT,
    DELETE,
    PATCH,
    OPTIONS,
    HEAD,
    UNKNOWN
};

inline std::string httpMethodToString(HttpMethod method) {
    switch (method) {
        case HttpMethod::GET: return "GET";
        case HttpMethod::POST: return "POST";
        case HttpMethod::PUT: return "PUT";
        case HttpMethod::DELETE: return "DELETE";
        case HttpMethod::PATCH: return "PATCH";
        case HttpMethod::OPTIONS: return "OPTIONS";
        case HttpMethod::HEAD: return "HEAD";
        default: return "UNKNOWN";
    }
}

inline HttpMethod stringToHttpMethod(const std::string& str) {
    if (str == "GET") return HttpMethod::GET;
    if (str == "POST") return HttpMethod::POST;
    if (str == "PUT") return HttpMethod::PUT;
    if (str == "DELETE") return HttpMethod::DELETE;
    if (str == "PATCH") return HttpMethod::PATCH;
    if (str == "OPTIONS") return HttpMethod::OPTIONS;
    if (str == "HEAD") return HttpMethod::HEAD;
    return HttpMethod::UNKNOWN;
}

enum class IssueSeverity {
    INFO,
    WARNING,
    ERROR
};

inline std::string severityToString(IssueSeverity sev) {
    switch (sev) {
        case IssueSeverity::INFO: return "INFO";
        case IssueSeverity::WARNING: return "WARNING";
        case IssueSeverity::ERROR: return "ERROR";
        default: return "UNKNOWN";
    }
}

struct Issue {
    IssueSeverity severity{IssueSeverity::WARNING};
    std::string description;
    std::string recommendation;
};

struct HttpParam {
    std::string name;
    std::string type;
    std::string source; // "query", "path", "body", "header"
    bool required{true};
    bool hasValidation{false};
};

struct ApiMethod {
    std::string name;
    HttpMethod httpMethod{HttpMethod::GET};
    std::string routePath;
    std::string returnType{"void"};
    std::vector<HttpParam> parameters;
    
    // Advanced traits
    bool isAsync{false};
    std::vector<std::string> middlewares;
    std::vector<std::string> filters;
    
    bool hasExceptionHandling{false};
    bool hasCaching{false};
    bool hasValidation{false};
    
    int lineNumber{0};
    std::vector<Issue> issues;
};

struct Controller {
    std::string name;
    std::string baseRoute;
    std::string filePath;
    std::vector<std::string> middlewares;
    std::vector<std::string> filters;
    std::vector<ApiMethod> methods;
};

struct AnalysisSummary {
    int totalFilesScanned{0};
    int totalControllers{0};
    int totalMethods{0};
    int totalIssues{0};
    int asyncMethodsCount{0};
    int middlewaresCount{0};
    int filtersCount{0};
    double elapsedMilliseconds{0.0};
    std::vector<std::string> globalRecommendations;
    std::vector<std::string> errorLogs;
};

} // namespace ApiAnalyzer
