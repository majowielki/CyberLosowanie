using System.Reflection;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// SqlException has no public constructor; the services recognise a unique-index
    /// violation by its SQL Server error number, so tests build one through the
    /// internal factory the client library itself uses.
    /// </summary>
    internal static class SqlExceptionFactory
    {
        /// <summary>A DbUpdateException wrapping SQL Server error 2601 (duplicate key in unique index).</summary>
        public static DbUpdateException UniqueIndexViolation() =>
            new("An error occurred while saving the entity changes.", Create(2601));

        private static SqlException Create(int number)
        {
            const BindingFlags NonPublic = BindingFlags.NonPublic | BindingFlags.Instance;

            // Fill the widest internal SqlError constructor: the error number goes into
            // the first int parameter, the rest get neutral values.
            var errorCtor = typeof(SqlError).GetConstructors(NonPublic)
                .OrderByDescending(c => c.GetParameters().Length)
                .First();
            var numberSet = false;
            var args = errorCtor.GetParameters().Select(p =>
            {
                if (p.ParameterType == typeof(int) && !numberSet)
                {
                    numberSet = true;
                    return (object?)number;
                }
                if (p.ParameterType == typeof(string)) return "test";
                return p.ParameterType.IsValueType ? Activator.CreateInstance(p.ParameterType) : null;
            }).ToArray();
            var error = (SqlError)errorCtor.Invoke(args);

            var errors = (SqlErrorCollection)typeof(SqlErrorCollection).GetConstructors(NonPublic)[0].Invoke(null);
            typeof(SqlErrorCollection).GetMethod("Add", NonPublic)!.Invoke(errors, new object[] { error });

            var create = typeof(SqlException).GetMethod(
                "CreateException",
                BindingFlags.NonPublic | BindingFlags.Static,
                new[] { typeof(SqlErrorCollection), typeof(string) })!;
            return (SqlException)create.Invoke(null, new object[] { errors, "16.0" })!;
        }
    }
}
