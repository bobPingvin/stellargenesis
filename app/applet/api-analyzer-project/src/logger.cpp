#include "logger.h"
#include <chrono>
#include <iomanip>
#include <sstream>

namespace ApiAnalyzer {

Logger& Logger::instance() {
    static Logger inst;
    return inst;
}

Logger::Logger() {
    init("api_analysis_log.txt");
}

Logger::~Logger() {
    std::lock_guard<std::mutex> lock(logMutex_);
    if (logFile_.is_open()) {
        logFile_.close();
    }
}

void Logger::init(const std::string& logFilePath) {
    std::lock_guard<std::mutex> lock(logMutex_);
    if (logFile_.is_open()) {
        logFile_.close();
    }
    filePath_ = logFilePath;
    logFile_.open(filePath_, std::ios::out | std::ios::app);
    if (!logFile_.is_open()) {
        std::cerr << "[Logger Error] Unable to open log file: " << filePath_ << "\n";
    }
}

void Logger::setConsoleEcho(bool echo) {
    std::lock_guard<std::mutex> lock(logMutex_);
    consoleEcho_ = echo;
}

void Logger::setMinLevel(LogLevel level) {
    std::lock_guard<std::mutex> lock(logMutex_);
    minLevel_ = level;
}

std::string Logger::getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto nowTime = std::chrono::system_clock::to_time_t(now);
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()) % 1000;

    std::tm tmSnapshot;
#if defined(_WIN32)
    localtime_s(&tmSnapshot, &nowTime);
#else
    localtime_r(&nowTime, &tmSnapshot);
#endif

    std::ostringstream oss;
    oss << std::put_time(&tmSnapshot, "%Y-%m-%d %H:%M:%S")
        << '.' << std::setfill('0') << std::setw(3) << ms.count();
    return oss.str();
}

std::string Logger::levelToString(LogLevel level) {
    switch (level) {
        case LogLevel::DEBUG_LVL: return "DEBUG";
        case LogLevel::INFO_LVL:  return "INFO";
        case LogLevel::WARN_LVL:  return "WARN";
        case LogLevel::ERROR_LVL: return "ERROR";
        default: return "LOG";
    }
}

void Logger::log(LogLevel level, const std::string& message) {
    if (level < minLevel_) {
        return;
    }

    std::string timestamp = getCurrentTimestamp();
    std::string lvlStr = levelToString(level);

    std::ostringstream formatted;
    formatted << "[" << timestamp << "] [" << lvlStr << "] " << message << "\n";
    std::string outputStr = formatted.str();

    std::lock_guard<std::mutex> lock(logMutex_);
    if (logFile_.is_open()) {
        logFile_ << outputStr;
        logFile_.flush();
    }

    if (consoleEcho_) {
        if (level == LogLevel::ERROR_LVL) {
            std::cerr << outputStr;
        } else {
            std::cout << outputStr;
        }
    }
}

void Logger::debug(const std::string& message) { log(LogLevel::DEBUG_LVL, message); }
void Logger::info(const std::string& message)  { log(LogLevel::INFO_LVL, message); }
void Logger::warn(const std::string& message)  { log(LogLevel::WARN_LVL, message); }
void Logger::error(const std::string& message) { log(LogLevel::ERROR_LVL, message); }

} // namespace ApiAnalyzer
