using CyberLosowanie.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace CyberLosowanie.Test.TestSupport
{
    /// <summary>
    /// A throwaway SQLite in-memory database with a real relational engine — so
    /// repository tests exercise genuine transactions and the seeded schema (I4).
    /// The in-memory database lives as long as its connection stays open, so this
    /// type owns the connection and disposes it (and the context) together.
    /// </summary>
    public sealed class SqliteTestDatabase : IDisposable
    {
        private readonly SqliteConnection _connection;

        public ApplicationDbContext Context { get; }

        public SqliteTestDatabase()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            Context = new ApplicationDbContext(options);
            Context.Database.EnsureCreated();
        }

        /// <summary>Opens a fresh context over the same in-memory database (new tracking scope).</summary>
        public ApplicationDbContext NewContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;
            return new ApplicationDbContext(options);
        }

        public void Dispose()
        {
            Context.Dispose();
            _connection.Dispose();
        }
    }
}
