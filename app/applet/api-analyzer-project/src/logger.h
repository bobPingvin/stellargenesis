#pragma once

#include <string>
#include <fstream>
#include <mutex>
#include <iostream>

namespace ApiAnalyzer {

enum class LogLevel {
    DEBUG_LVL,
    INFO_LVL,
    WARN_LVL,
    ERROR_LVL
};

class Logger {
public:
    static Logger& instance();

    void init(const std::string& logFilePath = "api_analysis_log.txt");
    void setConsoleEcho(bool echo);
    void setMinLevel(LogLevel level);

    void log(LogLevel level, const std::string& message);
    void debug(const std::string& message);
    void info(const std::string& message);
    void warn(const std::string& message);
    void error(const std::string& message);

private:
    Logger();
    ~Logger();
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;

    std::string getCurrentTimestamp();
    std::string levelToString(LogLevel level);

    std::ofstream logFile_;
    std::string filePath_;
    std::mutex logMutex_;
    bool consoleEcho_{true};
    LogLevel minLevel_{LogLevel::INFO_LVL};
};

} // namespace ApiAnalyzer
