using System;
using System.Collections.Generic;

namespace kairo_ui.Models.Dashboard
{
    /// <summary>
    /// View model for the dashboard page
    /// </summary>
    public class DashboardViewModel
    {
        public string? UserName { get; set; }
        public string? BankName { get; set; }
        public string? BranchName { get; set; }
        public string? BranchCode { get; set; }
        public DateTime CurrentDate { get; set; } = DateTime.Now;

        // Dashboard Statistics
        public DashboardStats Stats { get; set; } = new DashboardStats();
        
        // Financial Overview
        public PortfolioMetrics Portfolio { get; set; } = new PortfolioMetrics();

        // Recent Activity
        public List<TransactionRecord> RecentTransactions { get; set; } = [];

        // Additional Data
        public string OperationalEfficiency { get; set; } = "98.7%";
        public string? ErrorMessage { get; set; }

        // Start Menu and Resources
        public StartMenuViewModel StartMenu { get; set; } = new StartMenuViewModel();
    }

    /// <summary>
    /// Dashboard statistics model
    /// </summary>
    public class DashboardStats
    {
        public int Members { get; set; }
        public int MembersChange { get; set; }
        public decimal TotalAssets { get; set; }
        public decimal AssetsChangePercent { get; set; }
        public int Transactions { get; set; }
        public string? PeakTime { get; set; }
        public decimal TodaysVolume { get; set; }
        public string? VolumeTime { get; set; }
    }

    /// <summary>
    /// Portfolio metrics model
    /// </summary>
    public class PortfolioMetrics
    {
        public LoanPortfolio LoanPortfolio { get; set; } = new LoanPortfolio();
        public DepositMetric Deposits { get; set; } = new DepositMetric();
        public NplMetric NPL { get; set; } = new NplMetric();
        public LiquidityMetric Liquidity { get; set; } = new LiquidityMetric();
    }

    /// <summary>
    /// Loan portfolio model
    /// </summary>
    public class LoanPortfolio
    {
        public decimal Amount { get; set; }
        public decimal ChangePercent { get; set; }
        public string ChangeDirection { get; set; } = "up";
    }

    /// <summary>
    /// Deposit metric model
    /// </summary>
    public class DepositMetric
    {
        public decimal Amount { get; set; }
        public decimal ChangePercent { get; set; }
        public string ChangeDirection { get; set; } = "up";
    }

    /// <summary>
    /// NPL (Non-Performing Loan) metric model
    /// </summary>
    public class NplMetric
    {
        public decimal Ratio { get; set; }
        public string Status { get; set; } = "good";
    }

    /// <summary>
    /// Liquidity metric model
    /// </summary>
    public class LiquidityMetric
    {
        public decimal Ratio { get; set; }
        public decimal ChangePercent { get; set; }
    }

    /// <summary>
    /// Transaction record model
    /// </summary>
    public class TransactionRecord
    {
        public int Id { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
        public decimal Amount { get; set; }
        public string? Type { get; set; }
        public string? Status { get; set; }
        public DateTime Timestamp { get; set; }
        public string? Branch { get; set; }
    }
}
